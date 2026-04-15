from __future__ import annotations

import pytest

from app.core.crypto import TokenEncryptor
from app.core.utils.time import utcnow
from app.db.models import Account, AccountStatus
from app.modules.accounts.codex_auth_switcher import CodexAuthSnapshotIndex
from app.modules.accounts.service import AccountsService


class _Repo:
    def __init__(self, account: Account) -> None:
        self._account = account
        self.deleted_account_id: str | None = None

    async def get_by_id(self, account_id: str) -> Account | None:
        if account_id == self._account.id:
            return self._account
        return None

    async def delete_codex_sessions_for_account(self, account_id: str) -> None:
        self.deleted_account_id = account_id


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
        last_refresh=utcnow(),
        status=AccountStatus.ACTIVE,
        deactivation_reason=None,
    )


@pytest.mark.asyncio
async def test_terminate_account_live_codex_sessions_remembers_snapshot_even_when_no_process_was_killed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account = _make_account("acc-a", "a@example.com")
    repo = _Repo(account)
    service = AccountsService(repo=repo)
    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={account.id: ["snap-a"]},
        active_snapshot_name="snap-a",
    )

    monkeypatch.setattr(
        "app.modules.accounts.service.build_snapshot_index",
        lambda: snapshot_index,
    )
    monkeypatch.setattr(
        "app.modules.accounts.service.terminate_live_codex_processes_for_snapshot",
        lambda _snapshot_name: 0,
    )

    remembered: dict[str, object] = {}

    def _remember(snapshot_names: list[str], *, observed_at=None) -> None:
        remembered["snapshot_names"] = snapshot_names
        remembered["observed_at"] = observed_at

    monkeypatch.setattr(
        "app.modules.accounts.service.remember_terminated_cli_session_snapshots",
        _remember,
    )

    result = await service.terminate_account_live_codex_sessions(account.id)

    assert result is not None
    assert result.account_id == account.id
    assert result.snapshot_name == "snap-a"
    assert result.terminated_session_count == 0
    assert repo.deleted_account_id == account.id
    assert remembered["snapshot_names"] == ["snap-a"]
    assert remembered["observed_at"] is not None
