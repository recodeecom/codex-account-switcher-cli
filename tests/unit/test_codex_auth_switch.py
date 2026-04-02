from __future__ import annotations

import pytest

from app.tools.codex_auth_switch import (
    HttpResponse,
    SwitchToolError,
    _build_multipart_file,
    _extract_error_message,
    _validate_lb_url,
)

pytestmark = pytest.mark.unit


def test_build_multipart_file_contains_payload_and_boundary() -> None:
    content_type, body = _build_multipart_file("auth_json", "work.json", b'{"token":"abc"}')

    assert content_type.startswith("multipart/form-data; boundary=")
    boundary = content_type.split("boundary=", maxsplit=1)[1]

    assert b'filename="work.json"' in body
    assert b'{"token":"abc"}' in body
    assert f"--{boundary}".encode("utf-8") in body
    assert body.endswith(f"--{boundary}--\r\n".encode("utf-8"))


def test_extract_error_message_prefers_structured_error() -> None:
    response = HttpResponse(
        status=401,
        payload={"error": {"message": "Authentication is required", "code": "auth_required"}},
        raw_text="",
    )

    assert _extract_error_message(response) == "Authentication is required (code=auth_required)"


def test_validate_lb_url_rejects_invalid_scheme() -> None:
    with pytest.raises(SwitchToolError):
        _validate_lb_url("ftp://localhost:2455")
