from __future__ import annotations

from datetime import datetime, timezone

from app.core.crypto import TokenEncryptor
from app.db.models import Account, AccountStatus
from app.modules.accounts.codex_live_usage import (
    LocalCodexProcessSessionAttribution,
)
from app.modules.accounts.schemas import AccountCodexAuthStatus
from app.modules.accounts.task_preview_overlay import overlay_live_codex_task_previews


def _make_account(account_id: str, email: str) -> Account:
    encryptor = TokenEncryptor()
    return Account(
        id=account_id,
        chatgpt_account_id=f"chatgpt-{account_id}",
        email=email,
        plan_type="plus",
        access_token_encrypted=encryptor.encrypt("access"),
        refresh_token_encrypted=encryptor.encrypt("refresh"),
        id_token_encrypted=encryptor.encrypt("id"),
        last_refresh=datetime.now(tz=timezone.utc),
        status=AccountStatus.ACTIVE,
        deactivation_reason=None,
    )


def test_overlay_replaces_stale_preview_with_waiting_for_new_task(
    monkeypatch,
) -> None:
    account = _make_account("acc-admin", "admin@edixai.com")
    codex_auth_by_account = {
        account.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="admin@edixai.com",
            active_snapshot_name="admin@edixai.com",
            is_active_snapshot=True,
            has_live_session=True,
        )
    }
    codex_current_task_preview_by_account = {
        account.id: "the 2% is basically zero so anything under 5%",
    }

    monkeypatch.setattr(
        "app.modules.accounts.task_preview_overlay.read_local_codex_task_previews_by_snapshot",
        lambda *, now: {},
    )
    monkeypatch.setattr(
        "app.modules.accounts.task_preview_overlay.read_local_codex_task_previews_by_session_id",
        lambda *, now: {},
    )
    monkeypatch.setattr(
        "app.modules.accounts.task_preview_overlay.read_live_codex_process_session_attribution",
        lambda: LocalCodexProcessSessionAttribution(
            counts_by_snapshot={"admin@edixai.com": 2},
            unattributed_session_pids=[],
            mapped_session_pids_by_snapshot={"admin@edixai.com": [1506551, 1514670]},
            task_preview_by_pid={},
            task_previews_by_pid={},
        ),
    )

    overlay_live_codex_task_previews(
        accounts=[account],
        codex_auth_by_account=codex_auth_by_account,
        codex_current_task_preview_by_account=codex_current_task_preview_by_account,
        live_quota_debug_by_account={},
        now=datetime(2026, 4, 5, tzinfo=timezone.utc),
    )

    assert codex_current_task_preview_by_account[account.id] == "Waiting for new task"


def test_overlay_prefers_live_process_preview_for_snapshot(monkeypatch) -> None:
    account = _make_account("acc-bia", "bia@edixai.com")
    codex_auth_by_account = {
        account.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="bia@edixai.com",
            active_snapshot_name="bia@edixai.com",
            is_active_snapshot=True,
            has_live_session=True,
        )
    }
    codex_current_task_preview_by_account: dict[str, str] = {}

    monkeypatch.setattr(
        "app.modules.accounts.task_preview_overlay.read_local_codex_task_previews_by_snapshot",
        lambda *, now: {},
    )
    monkeypatch.setattr(
        "app.modules.accounts.task_preview_overlay.read_local_codex_task_previews_by_session_id",
        lambda *, now: {},
    )
    monkeypatch.setattr(
        "app.modules.accounts.task_preview_overlay.read_live_codex_process_session_attribution",
        lambda: LocalCodexProcessSessionAttribution(
            counts_by_snapshot={"bia@edixai.com": 1},
            unattributed_session_pids=[],
            mapped_session_pids_by_snapshot={"bia@edixai.com": [200001]},
            task_preview_by_pid={200001: "Investigate snapshot mapping"},
            task_previews_by_pid={200001: ["Investigate snapshot mapping"]},
        ),
    )

    overlay_live_codex_task_previews(
        accounts=[account],
        codex_auth_by_account=codex_auth_by_account,
        codex_current_task_preview_by_account=codex_current_task_preview_by_account,
        live_quota_debug_by_account={},
        now=datetime(2026, 4, 5, tzinfo=timezone.utc),
    )

    assert codex_current_task_preview_by_account[account.id] == "Investigate snapshot mapping"
