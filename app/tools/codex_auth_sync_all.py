from __future__ import annotations

import argparse
import http.cookiejar
import os
import sys
from pathlib import Path
from urllib.request import HTTPCookieProcessor, build_opener

from app.tools.codex_auth_switch import (
    DEFAULT_LB_URL,
    SwitchToolError,
    _ensure_dashboard_session,
    _import_account_snapshot,
    _validate_lb_url,
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import all codex-auth snapshots (~/.codex/accounts/*.json) into codex-lb in one run."
    )
    parser.add_argument(
        "--lb-url",
        default=os.environ.get("CODEX_LB_URL", DEFAULT_LB_URL),
        help=f"codex-lb dashboard base URL (default: env CODEX_LB_URL or {DEFAULT_LB_URL})",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("CODEX_LB_DASHBOARD_PASSWORD"),
        help="Dashboard password if dashboard auth is enabled (or set CODEX_LB_DASHBOARD_PASSWORD)",
    )
    parser.add_argument(
        "--totp-code",
        default=os.environ.get("CODEX_LB_DASHBOARD_TOTP_CODE"),
        help="Current 6-digit TOTP code (or set CODEX_LB_DASHBOARD_TOTP_CODE)",
    )
    parser.add_argument(
        "--totp-command",
        default=os.environ.get("CODEX_LB_DASHBOARD_TOTP_COMMAND"),
        help=(
            "Command that prints the current TOTP code (fallback when --totp-code is missing). "
            "Example: 'oathtool --totp -b <SECRET>'"
        ),
    )
    parser.add_argument(
        "--accounts-dir",
        default=os.environ.get("CODEX_AUTH_ACCOUNTS_DIR"),
        help="Override snapshot directory (default: ~/.codex/accounts)",
    )
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Keep importing remaining snapshots even if one fails",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print snapshots that would be imported and exit",
    )
    return parser.parse_args()


def _resolve_accounts_dir(raw: str | None) -> Path:
    if raw:
        return Path(raw).expanduser().resolve()
    return (Path.home() / ".codex" / "accounts").resolve()


def _iter_snapshot_files(accounts_dir: Path) -> list[Path]:
    if not accounts_dir.exists():
        raise SwitchToolError(f"Accounts directory not found: {accounts_dir}")
    if not accounts_dir.is_dir():
        raise SwitchToolError(f"Accounts path is not a directory: {accounts_dir}")

    snapshots = sorted((p for p in accounts_dir.iterdir() if p.is_file() and p.suffix == ".json"), key=lambda p: p.name)
    if not snapshots:
        raise SwitchToolError(
            f"No snapshots found in {accounts_dir}. Run `codex-auth save <name>` first."
        )
    return snapshots


def main() -> int:
    args = _parse_args()

    try:
        lb_url = _validate_lb_url(args.lb_url)
        accounts_dir = _resolve_accounts_dir(args.accounts_dir)
        snapshots = _iter_snapshot_files(accounts_dir)

        if args.dry_run:
            print(f"Found {len(snapshots)} snapshot(s):")
            for snapshot in snapshots:
                print(f"  - {snapshot.name}")
            return 0

        cookie_jar = http.cookiejar.CookieJar()
        opener = build_opener(HTTPCookieProcessor(cookie_jar))

        _ensure_dashboard_session(
            opener=opener,
            lb_url=lb_url,
            password=args.password,
            totp_code=args.totp_code,
            totp_command=args.totp_command,
        )

        imported: list[str] = []
        failed: list[tuple[str, str]] = []

        for snapshot in snapshots:
            try:
                _import_account_snapshot(opener=opener, lb_url=lb_url, snapshot_path=snapshot)
                imported.append(snapshot.name)
                print(f"Imported: {snapshot.name}")
            except SwitchToolError as exc:
                failed.append((snapshot.name, str(exc)))
                print(f"Failed: {snapshot.name} -> {exc}", file=sys.stderr)
                if not args.continue_on_error:
                    break

        print(
            "\nBulk sync summary:\n"
            f"  imported: {len(imported)}\n"
            f"  failed: {len(failed)}\n"
            f"  codex-lb: {lb_url}\n"
            f"  source: {accounts_dir}"
        )

        if failed:
            for name, reason in failed:
                print(f"  - {name}: {reason}", file=sys.stderr)
            return 1

        return 0
    except SwitchToolError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
