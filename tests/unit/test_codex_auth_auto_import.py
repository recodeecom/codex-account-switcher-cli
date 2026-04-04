from __future__ import annotations

import base64
import json
from pathlib import Path

import pytest

from app.core.auth import generate_unique_account_id
from app.modules.accounts.codex_auth_auto_import import _select_snapshot_name_for_account
from app.modules.accounts.codex_auth_switcher import build_email_snapshot_name

pytestmark = pytest.mark.unit


def _encode_jwt(payload: dict[str, object]) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    body = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    return f"header.{body}.sig"


def _write_auth_snapshot(path: Path, *, email: str, account_id: str) -> None:
    payload = {
        "email": email,
        "chatgpt_account_id": account_id,
        "https://api.openai.com/auth": {"chatgpt_plan_type": "plus"},
    }
    auth_json = {
        "tokens": {
            "idToken": _encode_jwt(payload),
            "accessToken": "access",
            "refreshToken": "refresh",
            "accountId": account_id,
        },
    }
    path.write_text(json.dumps(auth_json), encoding="utf-8")


def test_select_snapshot_name_for_account_prefers_existing_email_alias(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    email = "nagy.viktordp@gmail.com"
    raw_account_id = "acc-main"
    canonical_account_id = generate_unique_account_id(raw_account_id, email)
    accounts_dir = tmp_path / "accounts"
    accounts_dir.mkdir()

    _write_auth_snapshot(accounts_dir / "unique.json", email=email, account_id=raw_account_id)
    _write_auth_snapshot(
        accounts_dir / "nagy.viktordp-gmail-com.json",
        email=email,
        account_id=raw_account_id,
    )

    selected = _select_snapshot_name_for_account(
        account_id=canonical_account_id,
        email=email,
        accounts_dir=accounts_dir,
    )

    assert selected == "nagy.viktordp-gmail-com"


def test_select_snapshot_name_for_account_refreshes_existing_generic_snapshot_for_same_account(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    email = "nagy.viktordp@gmail.com"
    raw_account_id = "acc-main"
    canonical_account_id = generate_unique_account_id(raw_account_id, email)
    accounts_dir = tmp_path / "accounts"
    accounts_dir.mkdir()

    _write_auth_snapshot(accounts_dir / "unique.json", email=email, account_id=raw_account_id)

    selected = _select_snapshot_name_for_account(
        account_id=canonical_account_id,
        email=email,
        accounts_dir=accounts_dir,
    )

    assert selected == "unique"


def test_select_snapshot_name_for_account_appends_numeric_suffix_when_email_alias_taken_by_other_account(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    email = "nagy.viktordp+biz@gmail.com"
    raw_account_id = "acc-main"
    canonical_account_id = generate_unique_account_id(raw_account_id, email)
    accounts_dir = tmp_path / "accounts"
    accounts_dir.mkdir()

    # Another account already owns the canonical email-derived name.
    taken_name = build_email_snapshot_name(email)
    _write_auth_snapshot(
        accounts_dir / f"{taken_name}.json",
        email="nagy.viktordp-biz@gmail.com",
        account_id="acc-other",
    )

    selected = _select_snapshot_name_for_account(
        account_id=canonical_account_id,
        email=email,
        accounts_dir=accounts_dir,
    )

    assert selected == f"{taken_name}-2"


def test_select_snapshot_name_for_account_prefers_existing_snapshot_matched_by_email_when_account_id_drifted(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    email = "nagy.viktordp@gmail.com"
    accounts_dir = tmp_path / "accounts"
    accounts_dir.mkdir()

    # Legacy/generic snapshot exists for the same email but under a stale account id.
    _write_auth_snapshot(accounts_dir / "work.json", email=email, account_id="legacy-id")

    canonical_account_id = generate_unique_account_id("new-id", email)
    selected = _select_snapshot_name_for_account(
        account_id=canonical_account_id,
        email=email,
        accounts_dir=accounts_dir,
    )

    assert selected == "work"
