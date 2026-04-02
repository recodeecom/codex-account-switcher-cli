from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import subprocess
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener

DEFAULT_LB_URL = "http://127.0.0.1:2455"
SESSION_PATH = "/api/dashboard-auth/session"
PASSWORD_LOGIN_PATH = "/api/dashboard-auth/password/login"
TOTP_VERIFY_PATH = "/api/dashboard-auth/totp/verify"
ACCOUNT_IMPORT_PATH = "/api/accounts/import"


class SwitchToolError(RuntimeError):
    """Raised when the switch-and-sync flow fails."""


@dataclass(slots=True)
class SessionState:
    authenticated: bool
    password_required: bool
    totp_required_on_login: bool


@dataclass(slots=True)
class HttpResponse:
    status: int
    payload: dict[str, Any] | None
    raw_text: str


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Switch a local Codex account with codex-auth and sync that auth snapshot "
            "into codex-lb in one command."
        )
    )
    parser.add_argument("name", help="Account snapshot name managed by codex-auth (e.g. work, personal)")
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
        "--skip-import",
        action="store_true",
        help="Only switch codex-auth account and skip codex-lb import",
    )
    return parser.parse_args()


def _validate_lb_url(lb_url: str) -> str:
    parsed = urlparse(lb_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SwitchToolError(f"Invalid --lb-url: {lb_url}")
    return lb_url.rstrip("/")


def _run_codex_auth_use(name: str) -> None:
    try:
        subprocess.run(["codex-auth", "use", name], check=True)
    except FileNotFoundError as exc:
        raise SwitchToolError(
            "codex-auth is not installed. Install with: npm i -g codex-auth"
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise SwitchToolError(f"codex-auth use {name!r} failed with exit code {exc.returncode}") from exc


def _account_snapshot_path(name: str) -> Path:
    snapshot = Path.home() / ".codex" / "accounts" / f"{name}.json"
    if not snapshot.exists():
        raise SwitchToolError(
            f"Account snapshot not found: {snapshot}. "
            "Run `codex-auth save <name>` first."
        )
    if not snapshot.is_file():
        raise SwitchToolError(f"Account snapshot is not a file: {snapshot}")
    return snapshot


def _build_multipart_file(field_name: str, filename: str, payload: bytes) -> tuple[str, bytes]:
    boundary = f"----codexlb-{uuid.uuid4().hex}"
    boundary_bytes = boundary.encode("utf-8")

    body = b"".join(
        [
            b"--" + boundary_bytes + b"\r\n",
            f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"),
            b"Content-Type: application/json\r\n\r\n",
            payload,
            b"\r\n--" + boundary_bytes + b"--\r\n",
        ]
    )
    content_type = f"multipart/form-data; boundary={boundary}"
    return content_type, body


def _decode_json(raw: str) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        decoded = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if isinstance(decoded, dict):
        return decoded
    return None


def _extract_error_message(response: HttpResponse) -> str:
    payload = response.payload or {}
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict):
        message = error.get("message")
        code = error.get("code")
        if isinstance(message, str) and isinstance(code, str):
            return f"{message} (code={code})"
        if isinstance(message, str):
            return message
    if isinstance(payload.get("detail"), str):
        return payload["detail"]
    return response.raw_text.strip() or f"HTTP {response.status}"


def _request_json(
    *,
    opener: Any,
    method: str,
    url: str,
    payload: dict[str, Any] | None = None,
    body: bytes | None = None,
    headers: dict[str, str] | None = None,
) -> HttpResponse:
    request_headers = dict(headers or {})
    data = body
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")

    request = Request(url=url, data=data, method=method, headers=request_headers)

    try:
        with opener.open(request, timeout=20) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return HttpResponse(status=response.status, payload=_decode_json(raw), raw_text=raw)
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return HttpResponse(status=exc.code, payload=_decode_json(raw), raw_text=raw)
    except URLError as exc:
        raise SwitchToolError(f"Failed to reach codex-lb at {url}: {exc.reason}") from exc


def _read_session_state(opener: Any, lb_url: str) -> SessionState:
    response = _request_json(opener=opener, method="GET", url=f"{lb_url}{SESSION_PATH}")
    if response.status != 200 or response.payload is None:
        detail = _extract_error_message(response)
        raise SwitchToolError(f"Failed to read dashboard session state: {detail}")

    payload = response.payload
    return SessionState(
        authenticated=bool(payload.get("authenticated", False)),
        password_required=bool(payload.get("password_required", False)),
        totp_required_on_login=bool(payload.get("totp_required_on_login", False)),
    )


def _resolve_totp_code(direct_code: str | None, command: str | None) -> str | None:
    if direct_code:
        return direct_code.strip()
    if not command:
        return None

    completed = subprocess.run(
        command,
        shell=True,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        stderr = completed.stderr.strip()
        detail = stderr if stderr else f"exit code {completed.returncode}"
        raise SwitchToolError(f"Failed to generate TOTP code via --totp-command: {detail}")

    code = completed.stdout.strip()
    return code or None


def _ensure_dashboard_session(
    *,
    opener: Any,
    lb_url: str,
    password: str | None,
    totp_code: str | None,
    totp_command: str | None,
) -> None:
    state = _read_session_state(opener, lb_url)
    if state.authenticated:
        return
    if not state.password_required:
        return

    if not password:
        raise SwitchToolError(
            "Dashboard auth is enabled. Provide --password or CODEX_LB_DASHBOARD_PASSWORD."
        )

    login_response = _request_json(
        opener=opener,
        method="POST",
        url=f"{lb_url}{PASSWORD_LOGIN_PATH}",
        payload={"password": password},
    )
    if login_response.status != 200:
        detail = _extract_error_message(login_response)
        raise SwitchToolError(f"Dashboard password login failed: {detail}")

    state = _read_session_state(opener, lb_url)
    if state.authenticated:
        return

    if state.totp_required_on_login:
        resolved_totp_code = _resolve_totp_code(totp_code, totp_command)
        if not resolved_totp_code:
            raise SwitchToolError(
                "Dashboard requires TOTP. Provide --totp-code or --totp-command "
                "(or CODEX_LB_DASHBOARD_TOTP_CODE / CODEX_LB_DASHBOARD_TOTP_COMMAND)."
            )

        verify_response = _request_json(
            opener=opener,
            method="POST",
            url=f"{lb_url}{TOTP_VERIFY_PATH}",
            payload={"code": resolved_totp_code},
        )
        if verify_response.status != 200:
            detail = _extract_error_message(verify_response)
            raise SwitchToolError(f"Dashboard TOTP verification failed: {detail}")

    state = _read_session_state(opener, lb_url)
    if not state.authenticated:
        raise SwitchToolError("Dashboard session is still unauthenticated after login flow")


def _import_account_snapshot(opener: Any, lb_url: str, snapshot_path: Path) -> None:
    payload = snapshot_path.read_bytes()
    content_type, body = _build_multipart_file("auth_json", snapshot_path.name, payload)

    response = _request_json(
        opener=opener,
        method="POST",
        url=f"{lb_url}{ACCOUNT_IMPORT_PATH}",
        body=body,
        headers={"Content-Type": content_type},
    )

    if response.status == 200:
        return

    detail = _extract_error_message(response)
    raise SwitchToolError(f"Account import failed: {detail}")


def main() -> int:
    args = _parse_args()
    lb_url = _validate_lb_url(args.lb_url)

    try:
        _run_codex_auth_use(args.name)
        snapshot_path = _account_snapshot_path(args.name)

        if args.skip_import:
            print(f"Switched codex-auth account to '{args.name}'.")
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
        _import_account_snapshot(opener=opener, lb_url=lb_url, snapshot_path=snapshot_path)

        print(
            "Switched and synced successfully:\n"
            f"  account: {args.name}\n"
            f"  snapshot: {snapshot_path}\n"
            f"  codex-lb: {lb_url}"
        )
        return 0
    except SwitchToolError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
