from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import shlex
import subprocess
import sys
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Mapping, Sequence
from urllib.request import HTTPCookieProcessor, build_opener

from app.tools.codex_auth_switch import (
    DEFAULT_LB_URL,
    SwitchToolError,
    _ensure_dashboard_session,
    _import_account_snapshot,
    _validate_lb_url,
)

_NAME_PATTERN = r"^[a-zA-Z0-9][a-zA-Z0-9._-]*$"


class MultiRuntimeToolError(RuntimeError):
    """Raised when runtime-scoped auth operations fail."""


@dataclass(slots=True, frozen=True)
class RuntimePaths:
    runtime_name: str
    runtime_dir: Path
    accounts_dir: Path
    current_path: Path
    auth_path: Path


def _validate_name(name: str, *, label: str) -> str:
    import re

    normalized = name.strip().replace(".json", "")
    if not normalized or not re.match(_NAME_PATTERN, normalized):
        raise MultiRuntimeToolError(
            f"Invalid {label} {name!r}. Use letters, numbers, dots, underscores, or dashes."
        )
    return normalized


def resolve_accounts_dir(raw: str | None = None) -> Path:
    if raw:
        return Path(raw).expanduser().resolve()
    env = os.environ.get("CODEX_AUTH_ACCOUNTS_DIR")
    if env:
        return Path(env).expanduser().resolve()
    return (Path.home() / ".codex" / "accounts").resolve()


def resolve_runtime_root(raw: str | None = None) -> Path:
    if raw:
        return Path(raw).expanduser().resolve()
    env = os.environ.get("CODEX_AUTH_RUNTIME_ROOT")
    if env:
        return Path(env).expanduser().resolve()
    return (Path.home() / ".codex" / "runtimes").resolve()


def build_runtime_paths(
    runtime_name: str,
    *,
    runtime_root: Path | None = None,
    accounts_dir: Path | None = None,
) -> RuntimePaths:
    normalized_runtime_name = _validate_name(runtime_name, label="runtime name")
    root = (runtime_root or resolve_runtime_root()).resolve()
    snapshots = (accounts_dir or resolve_accounts_dir()).resolve()
    runtime_dir = root / normalized_runtime_name
    return RuntimePaths(
        runtime_name=normalized_runtime_name,
        runtime_dir=runtime_dir,
        accounts_dir=snapshots,
        current_path=runtime_dir / "current",
        auth_path=runtime_dir / "auth.json",
    )


def build_runtime_env(paths: RuntimePaths) -> dict[str, str]:
    return {
        "CODEX_AUTH_ACCOUNTS_DIR": str(paths.accounts_dir),
        "CODEX_AUTH_CURRENT_PATH": str(paths.current_path),
        "CODEX_AUTH_JSON_PATH": str(paths.auth_path),
    }


def format_env_exports(env_map: Mapping[str, str]) -> str:
    lines = [f"export {key}={shlex.quote(value)}" for key, value in sorted(env_map.items())]
    return "\n".join(lines)


@contextmanager
def temporary_env(overrides: Mapping[str, str]) -> Iterator[None]:
    previous = {key: os.environ.get(key) for key in overrides}
    try:
        for key, value in overrides.items():
            os.environ[key] = value
        yield
    finally:
        for key, old_value in previous.items():
            if old_value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = old_value


def _replace_auth_pointer(target_snapshot: Path, auth_path: Path) -> None:
    auth_path.parent.mkdir(parents=True, exist_ok=True)
    if auth_path.is_symlink() or auth_path.exists():
        auth_path.unlink()
    try:
        auth_path.symlink_to(target_snapshot.resolve())
    except OSError:
        auth_path.write_bytes(target_snapshot.read_bytes())


def activate_runtime_snapshot(paths: RuntimePaths, snapshot_name: str) -> Path:
    normalized_snapshot_name = _validate_name(snapshot_name, label="snapshot name")
    snapshot_path = paths.accounts_dir / f"{normalized_snapshot_name}.json"
    if not snapshot_path.exists() or not snapshot_path.is_file():
        raise MultiRuntimeToolError(
            f"Snapshot {normalized_snapshot_name!r} was not found at {snapshot_path}. "
            "Run `codex-auth save <name>` first."
        )

    paths.current_path.parent.mkdir(parents=True, exist_ok=True)
    paths.current_path.write_text(f"{normalized_snapshot_name}\n", encoding="utf-8")
    _replace_auth_pointer(snapshot_path, paths.auth_path)
    return snapshot_path


def read_runtime_current(paths: RuntimePaths) -> str | None:
    if not paths.current_path.exists() or not paths.current_path.is_file():
        return None
    value = paths.current_path.read_text(encoding="utf-8", errors="replace").strip()
    return value or None


def run_command_in_runtime(
    paths: RuntimePaths,
    command: Sequence[str],
    *,
    extra_env: Mapping[str, str] | None = None,
) -> int:
    if not command:
        raise MultiRuntimeToolError("No command provided. Usage: codex-lb-runtime run <runtime> -- <command...>")
    env = os.environ.copy()
    env.update(build_runtime_env(paths))
    if extra_env:
        env.update(extra_env)
    completed = subprocess.run(list(command), check=False, env=env)
    return completed.returncode


def _sync_snapshot_to_dashboard(
    *,
    snapshot_path: Path,
    lb_url: str,
    password: str | None,
    totp_code: str | None,
    totp_command: str | None,
) -> None:
    validated_url = _validate_lb_url(lb_url)
    cookie_jar = http.cookiejar.CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookie_jar))
    _ensure_dashboard_session(
        opener=opener,
        lb_url=validated_url,
        password=password,
        totp_code=totp_code,
        totp_command=totp_command,
    )
    _import_account_snapshot(opener=opener, lb_url=validated_url, snapshot_path=snapshot_path)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Runtime-scoped Codex auth switching. "
            "Use independent runtime profiles so multiple terminals can run different accounts concurrently."
        )
    )
    parser.add_argument(
        "--runtime-root",
        default=os.environ.get("CODEX_AUTH_RUNTIME_ROOT"),
        help="Runtime root directory (default: ~/.codex/runtimes)",
    )
    parser.add_argument(
        "--accounts-dir",
        default=os.environ.get("CODEX_AUTH_ACCOUNTS_DIR"),
        help="Snapshot directory (default: ~/.codex/accounts)",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    env_parser = subparsers.add_parser("env", help="Print CODEX_AUTH_* exports for a runtime")
    env_parser.add_argument("runtime", help="Runtime name (e.g. terminal-a)")
    env_parser.add_argument(
        "--format",
        choices=["sh", "json"],
        default="sh",
        help="Output format (default: sh)",
    )

    current_parser = subparsers.add_parser("current", help="Show currently active snapshot for a runtime")
    current_parser.add_argument("runtime", help="Runtime name (e.g. terminal-a)")

    use_parser = subparsers.add_parser("use", help="Switch runtime auth to a snapshot")
    use_parser.add_argument("runtime", help="Runtime name (e.g. terminal-a)")
    use_parser.add_argument("account", help="Snapshot/account name")
    use_parser.add_argument(
        "--sync-dashboard",
        action="store_true",
        help="Also import selected snapshot into codex-lb dashboard after switching runtime auth",
    )
    use_parser.add_argument(
        "--lb-url",
        default=os.environ.get("CODEX_LB_URL", DEFAULT_LB_URL),
        help=f"codex-lb dashboard base URL (default: env CODEX_LB_URL or {DEFAULT_LB_URL})",
    )
    use_parser.add_argument(
        "--password",
        default=os.environ.get("CODEX_LB_DASHBOARD_PASSWORD"),
        help="Dashboard password if dashboard auth is enabled",
    )
    use_parser.add_argument(
        "--totp-code",
        default=os.environ.get("CODEX_LB_DASHBOARD_TOTP_CODE"),
        help="Current 6-digit TOTP code",
    )
    use_parser.add_argument(
        "--totp-command",
        default=os.environ.get("CODEX_LB_DASHBOARD_TOTP_COMMAND"),
        help="Command that prints current TOTP code",
    )

    run_parser = subparsers.add_parser("run", help="Run a command with runtime-scoped CODEX_AUTH_* env")
    run_parser.add_argument("runtime", help="Runtime name (e.g. terminal-a)")
    run_parser.add_argument(
        "command_args",
        nargs=argparse.REMAINDER,
        help="Command to run. Use: codex-lb-runtime run <runtime> -- <command...>",
    )

    return parser.parse_args()


def _build_paths_from_args(args: argparse.Namespace, runtime_name: str) -> RuntimePaths:
    runtime_root = resolve_runtime_root(args.runtime_root)
    accounts_dir = resolve_accounts_dir(args.accounts_dir)
    return build_runtime_paths(runtime_name, runtime_root=runtime_root, accounts_dir=accounts_dir)


def _handle_env(args: argparse.Namespace) -> int:
    paths = _build_paths_from_args(args, args.runtime)
    env_map = build_runtime_env(paths)
    if args.format == "json":
        print(json.dumps(env_map, indent=2, sort_keys=True))
    else:
        print(format_env_exports(env_map))
    return 0


def _handle_current(args: argparse.Namespace) -> int:
    paths = _build_paths_from_args(args, args.runtime)
    current = read_runtime_current(paths)
    if current:
        print(current)
        return 0
    print("(none)")
    return 0


def _handle_use(args: argparse.Namespace) -> int:
    paths = _build_paths_from_args(args, args.runtime)
    snapshot_path = activate_runtime_snapshot(paths, args.account)

    if args.sync_dashboard:
        _sync_snapshot_to_dashboard(
            snapshot_path=snapshot_path,
            lb_url=args.lb_url,
            password=args.password,
            totp_code=args.totp_code,
            totp_command=args.totp_command,
        )

    print(
        "Runtime switched:\n"
        f"  runtime: {paths.runtime_name}\n"
        f"  account: {snapshot_path.stem}\n"
        f"  current: {paths.current_path}\n"
        f"  auth: {paths.auth_path}\n"
        f"  accounts: {paths.accounts_dir}"
    )
    if args.sync_dashboard:
        print(f"  codex-lb: {_validate_lb_url(args.lb_url)}")
    return 0


def _handle_run(args: argparse.Namespace) -> int:
    paths = _build_paths_from_args(args, args.runtime)
    command_args: list[str] = list(args.command_args)
    if command_args and command_args[0] == "--":
        command_args = command_args[1:]
    return run_command_in_runtime(paths, command_args)


def main() -> int:
    args = _parse_args()
    try:
        if args.command == "env":
            return _handle_env(args)
        if args.command == "current":
            return _handle_current(args)
        if args.command == "use":
            return _handle_use(args)
        if args.command == "run":
            return _handle_run(args)
        raise MultiRuntimeToolError(f"Unsupported command: {args.command}")
    except (MultiRuntimeToolError, SwitchToolError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
