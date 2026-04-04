from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.core.crypto import TokenEncryptor
from app.db.models import Account, AccountStatus, UsageHistory
from app.modules.accounts.codex_auth_switcher import CodexAuthSnapshotIndex
from app.modules.accounts.codex_live_usage import LocalCodexLiveUsage, LocalUsageWindow
from app.modules.accounts.live_usage_overrides import (
    _apply_local_default_session_fingerprint_overrides,
    _match_sample_to_account,
    apply_local_live_usage_overrides,
)
from app.modules.accounts.schemas import AccountCodexAuthStatus


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


def _usage_entry(
    *,
    account_id: str,
    window: str,
    used_percent: float,
    reset_at: int | None,
    window_minutes: int,
) -> UsageHistory:
    return UsageHistory(
        account_id=account_id,
        window=window,
        used_percent=used_percent,
        reset_at=reset_at,
        window_minutes=window_minutes,
        recorded_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
    )


def _live_sample(
    *,
    recorded_at: datetime,
    primary_used: float,
    secondary_used: float,
    primary_reset: int | None,
    secondary_reset: int | None,
) -> LocalCodexLiveUsage:
    return LocalCodexLiveUsage(
        recorded_at=recorded_at,
        active_session_count=1,
        primary=LocalUsageWindow(used_percent=primary_used, reset_at=primary_reset, window_minutes=300),
        secondary=LocalUsageWindow(used_percent=secondary_used, reset_at=secondary_reset, window_minutes=10_080),
    )


def _sample(*, used_percent: float, reset_at: int) -> LocalCodexLiveUsage:
    return _live_sample(
        recorded_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
        primary_used=used_percent,
        secondary_used=used_percent,
        primary_reset=reset_at,
        secondary_reset=reset_at + 3_600,
    )


def test_apply_local_live_usage_overrides_marks_active_snapshot_live_when_recent_switch_has_running_process(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account = _make_account("acc-a", "a@example.com")
    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={account.id: ["snap-a"]},
        active_snapshot_name="snap-a",
    )
    codex_auth_by_account = {
        account.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="snap-a",
            active_snapshot_name="snap-a",
            is_active_snapshot=True,
            has_live_session=False,
        )
    }
    primary_usage: dict[str, UsageHistory] = {}
    secondary_usage: dict[str, UsageHistory] = {}
    codex_session_counts_by_account = {account.id: 0}

    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.read_local_codex_live_usage_by_snapshot",
        lambda: {},
    )
    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.has_recent_active_snapshot_process_fallback",
        lambda: True,
    )

    candidates = apply_local_live_usage_overrides(
        accounts=[account],
        snapshot_index=snapshot_index,
        codex_auth_by_account=codex_auth_by_account,
        primary_usage=primary_usage,
        secondary_usage=secondary_usage,
        codex_live_session_counts_by_account=codex_session_counts_by_account,
    )

    assert candidates == []
    assert codex_auth_by_account[account.id].has_live_session is True
    assert codex_session_counts_by_account[account.id] == 1


def test_match_sample_prefers_unique_reset_fingerprint_over_percent_similarity() -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    baseline_primary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="primary",
            used_percent=90.0,
            reset_at=1_717_000_100,
            window_minutes=300,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="primary",
            used_percent=10.0,
            reset_at=1_717_000_900,
            window_minutes=300,
        ),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="secondary",
            used_percent=45.0,
            reset_at=1_717_004_100,
            window_minutes=10_080,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="secondary",
            used_percent=45.0,
            reset_at=1_717_004_100,
            window_minutes=10_080,
        ),
    }

    sample = _sample(used_percent=90.0, reset_at=1_717_000_900)
    matched = _match_sample_to_account(
        sample=sample,
        accounts=accounts,
        baseline_primary_usage=baseline_primary,
        baseline_secondary_usage=baseline_secondary,
    )

    assert matched is not None
    assert matched.account_id == account_b.id
    assert matched.confidence == "high"


def test_match_sample_uses_high_confidence_percent_fallback_when_reset_fingerprint_is_shared() -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    shared_primary_reset = 1_717_000_100
    shared_secondary_reset = 1_717_003_700
    baseline_primary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="primary",
            used_percent=20.0,
            reset_at=shared_primary_reset,
            window_minutes=300,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="primary",
            used_percent=72.0,
            reset_at=shared_primary_reset,
            window_minutes=300,
        ),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="secondary",
            used_percent=30.0,
            reset_at=shared_secondary_reset,
            window_minutes=10_080,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="secondary",
            used_percent=82.0,
            reset_at=shared_secondary_reset,
            window_minutes=10_080,
        ),
    }

    sample = _live_sample(
        recorded_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
        primary_used=22.0,
        secondary_used=32.0,
        primary_reset=shared_primary_reset,
        secondary_reset=shared_secondary_reset,
    )
    matched = _match_sample_to_account(
        sample=sample,
        accounts=accounts,
        baseline_primary_usage=baseline_primary,
        baseline_secondary_usage=baseline_secondary,
    )

    assert matched is not None
    assert matched.account_id == account_a.id
    assert matched.confidence == "high"


def test_match_sample_marks_ambiguous_percent_fallback_as_low_confidence() -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    shared_primary_reset = 1_717_000_100
    shared_secondary_reset = 1_717_003_700
    baseline_primary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="primary",
            used_percent=50.0,
            reset_at=shared_primary_reset,
            window_minutes=300,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="primary",
            used_percent=54.0,
            reset_at=shared_primary_reset,
            window_minutes=300,
        ),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="secondary",
            used_percent=50.0,
            reset_at=shared_secondary_reset,
            window_minutes=10_080,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="secondary",
            used_percent=54.0,
            reset_at=shared_secondary_reset,
            window_minutes=10_080,
        ),
    }

    sample = _live_sample(
        recorded_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
        primary_used=52.0,
        secondary_used=52.0,
        primary_reset=shared_primary_reset,
        secondary_reset=shared_secondary_reset,
    )
    matched = _match_sample_to_account(
        sample=sample,
        accounts=accounts,
        baseline_primary_usage=baseline_primary,
        baseline_secondary_usage=baseline_secondary,
    )

    assert matched is not None
    assert matched.account_id == account_a.id
    assert matched.confidence == "low"


def test_fallback_mapping_keeps_session_counts_but_does_not_override_quota_when_confidence_is_low(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={account_a.id: ["snap-a"], account_b.id: ["snap-b"]},
        active_snapshot_name="snap-a",
    )
    codex_auth_by_account = {
        account_a.id: AccountCodexAuthStatus(has_snapshot=True, snapshot_name="snap-a", active_snapshot_name="snap-a"),
        account_b.id: AccountCodexAuthStatus(has_snapshot=True, snapshot_name="snap-b", active_snapshot_name="snap-a"),
    }

    shared_primary_reset = 1_717_000_100
    shared_secondary_reset = 1_717_003_700
    baseline_primary = {
        account_a.id: _usage_entry(account_id=account_a.id, window="primary", used_percent=50.0, reset_at=shared_primary_reset, window_minutes=300),
        account_b.id: _usage_entry(account_id=account_b.id, window="primary", used_percent=54.0, reset_at=shared_primary_reset, window_minutes=300),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(account_id=account_a.id, window="secondary", used_percent=50.0, reset_at=shared_secondary_reset, window_minutes=10_080),
        account_b.id: _usage_entry(account_id=account_b.id, window="secondary", used_percent=54.0, reset_at=shared_secondary_reset, window_minutes=10_080),
    }

    primary_usage = dict(baseline_primary)
    secondary_usage = dict(baseline_secondary)
    codex_session_counts_by_account = {account_a.id: 0, account_b.id: 0}

    live_usage_by_snapshot = {
        "snap-a": LocalCodexLiveUsage(
            recorded_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
            active_session_count=2,
            primary=LocalUsageWindow(used_percent=58.0, reset_at=1_717_000_500, window_minutes=300),
            secondary=LocalUsageWindow(used_percent=58.0, reset_at=1_717_004_100, window_minutes=10_080),
        )
    }

    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.read_local_codex_live_usage_samples",
        lambda: [
            _live_sample(
                recorded_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
                primary_used=52.0,
                secondary_used=52.0,
                primary_reset=shared_primary_reset,
                secondary_reset=shared_secondary_reset,
            ),
            _live_sample(
                recorded_at=datetime(2026, 4, 3, 12, 1, tzinfo=timezone.utc),
                primary_used=52.0,
                secondary_used=52.0,
                primary_reset=shared_primary_reset,
                secondary_reset=shared_secondary_reset,
            ),
        ],
    )

    _apply_local_default_session_fingerprint_overrides(
        accounts=accounts,
        snapshot_index=snapshot_index,
        live_usage_by_snapshot=live_usage_by_snapshot,
        codex_auth_by_account=codex_auth_by_account,
        baseline_primary_usage=baseline_primary,
        baseline_secondary_usage=baseline_secondary,
        primary_usage=primary_usage,
        secondary_usage=secondary_usage,
        codex_session_counts_by_account=codex_session_counts_by_account,
    )

    assert sum(codex_session_counts_by_account.values()) == 2
    assert codex_auth_by_account[account_a.id].has_live_session is True
    assert codex_auth_by_account[account_a.id].live_usage_confidence == "low"
    assert primary_usage[account_a.id].used_percent == baseline_primary[account_a.id].used_percent
    assert secondary_usage[account_a.id].used_percent == baseline_secondary[account_a.id].used_percent


def test_fallback_mapping_applies_overrides_when_percent_fallback_is_high_confidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={account_a.id: ["snap-a"], account_b.id: ["snap-b"]},
        active_snapshot_name="snap-a",
    )
    codex_auth_by_account = {
        account_a.id: AccountCodexAuthStatus(has_snapshot=True, snapshot_name="snap-a", active_snapshot_name="snap-a"),
        account_b.id: AccountCodexAuthStatus(has_snapshot=True, snapshot_name="snap-b", active_snapshot_name="snap-a"),
    }

    shared_primary_reset = 1_717_000_100
    shared_secondary_reset = 1_717_003_700
    baseline_primary = {
        account_a.id: _usage_entry(account_id=account_a.id, window="primary", used_percent=20.0, reset_at=shared_primary_reset, window_minutes=300),
        account_b.id: _usage_entry(account_id=account_b.id, window="primary", used_percent=72.0, reset_at=shared_primary_reset, window_minutes=300),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(account_id=account_a.id, window="secondary", used_percent=30.0, reset_at=shared_secondary_reset, window_minutes=10_080),
        account_b.id: _usage_entry(account_id=account_b.id, window="secondary", used_percent=82.0, reset_at=shared_secondary_reset, window_minutes=10_080),
    }

    primary_usage = dict(baseline_primary)
    secondary_usage = dict(baseline_secondary)
    codex_session_counts_by_account = {account_a.id: 0, account_b.id: 0}

    live_usage_by_snapshot = {
        "snap-a": LocalCodexLiveUsage(
            recorded_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
            active_session_count=2,
            primary=LocalUsageWindow(used_percent=58.0, reset_at=1_717_000_500, window_minutes=300),
            secondary=LocalUsageWindow(used_percent=58.0, reset_at=1_717_004_100, window_minutes=10_080),
        )
    }

    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.read_local_codex_live_usage_samples",
        lambda: [
            _live_sample(
                recorded_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
                primary_used=22.0,
                secondary_used=32.0,
                primary_reset=shared_primary_reset,
                secondary_reset=shared_secondary_reset,
            ),
            _live_sample(
                recorded_at=datetime(2026, 4, 3, 12, 1, tzinfo=timezone.utc),
                primary_used=74.0,
                secondary_used=84.0,
                primary_reset=shared_primary_reset,
                secondary_reset=shared_secondary_reset,
            ),
        ],
    )

    _apply_local_default_session_fingerprint_overrides(
        accounts=accounts,
        snapshot_index=snapshot_index,
        live_usage_by_snapshot=live_usage_by_snapshot,
        codex_auth_by_account=codex_auth_by_account,
        baseline_primary_usage=baseline_primary,
        baseline_secondary_usage=baseline_secondary,
        primary_usage=primary_usage,
        secondary_usage=secondary_usage,
        codex_session_counts_by_account=codex_session_counts_by_account,
    )

    assert codex_session_counts_by_account == {account_a.id: 1, account_b.id: 1}
    assert codex_auth_by_account[account_a.id].live_usage_confidence == "high"
    assert codex_auth_by_account[account_b.id].live_usage_confidence == "high"
    assert primary_usage[account_a.id].used_percent == pytest.approx(22.0)
    assert secondary_usage[account_a.id].used_percent == pytest.approx(32.0)
    assert primary_usage[account_b.id].used_percent == pytest.approx(74.0)
    assert secondary_usage[account_b.id].used_percent == pytest.approx(84.0)


def test_fallback_mapping_is_stable_for_three_accounts_with_distinct_percent_patterns(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    account_c = _make_account("acc-c", "c@example.com")
    accounts = [account_a, account_b, account_c]

    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={account_a.id: ["snap-a"], account_b.id: ["snap-b"], account_c.id: ["snap-c"]},
        active_snapshot_name="snap-a",
    )

    shared_primary_reset = 1_717_000_100
    shared_secondary_reset = 1_717_003_700
    baseline_primary = {
        account_a.id: _usage_entry(account_id=account_a.id, window="primary", used_percent=15.0, reset_at=shared_primary_reset, window_minutes=300),
        account_b.id: _usage_entry(account_id=account_b.id, window="primary", used_percent=45.0, reset_at=shared_primary_reset, window_minutes=300),
        account_c.id: _usage_entry(account_id=account_c.id, window="primary", used_percent=85.0, reset_at=shared_primary_reset, window_minutes=300),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(account_id=account_a.id, window="secondary", used_percent=25.0, reset_at=shared_secondary_reset, window_minutes=10_080),
        account_b.id: _usage_entry(account_id=account_b.id, window="secondary", used_percent=55.0, reset_at=shared_secondary_reset, window_minutes=10_080),
        account_c.id: _usage_entry(account_id=account_c.id, window="secondary", used_percent=95.0, reset_at=shared_secondary_reset, window_minutes=10_080),
    }

    def _run_once() -> dict[str, int]:
        codex_auth_by_account = {
            account_a.id: AccountCodexAuthStatus(has_snapshot=True, snapshot_name="snap-a", active_snapshot_name="snap-a"),
            account_b.id: AccountCodexAuthStatus(has_snapshot=True, snapshot_name="snap-b", active_snapshot_name="snap-a"),
            account_c.id: AccountCodexAuthStatus(has_snapshot=True, snapshot_name="snap-c", active_snapshot_name="snap-a"),
        }
        primary_usage = dict(baseline_primary)
        secondary_usage = dict(baseline_secondary)
        codex_session_counts_by_account = {account_a.id: 0, account_b.id: 0, account_c.id: 0}

        _apply_local_default_session_fingerprint_overrides(
            accounts=accounts,
            snapshot_index=snapshot_index,
            live_usage_by_snapshot={
                "snap-a": LocalCodexLiveUsage(
                    recorded_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
                    active_session_count=3,
                    primary=LocalUsageWindow(used_percent=58.0, reset_at=1_717_000_500, window_minutes=300),
                    secondary=LocalUsageWindow(used_percent=58.0, reset_at=1_717_004_100, window_minutes=10_080),
                )
            },
            codex_auth_by_account=codex_auth_by_account,
            baseline_primary_usage=baseline_primary,
            baseline_secondary_usage=baseline_secondary,
            primary_usage=primary_usage,
            secondary_usage=secondary_usage,
            codex_session_counts_by_account=codex_session_counts_by_account,
        )

        return codex_session_counts_by_account

    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.read_local_codex_live_usage_samples",
        lambda: [
            _live_sample(
                recorded_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
                primary_used=14.0,
                secondary_used=24.0,
                primary_reset=shared_primary_reset,
                secondary_reset=shared_secondary_reset,
            ),
            _live_sample(
                recorded_at=datetime(2026, 4, 3, 12, 1, tzinfo=timezone.utc),
                primary_used=46.0,
                secondary_used=56.0,
                primary_reset=shared_primary_reset,
                secondary_reset=shared_secondary_reset,
            ),
            _live_sample(
                recorded_at=datetime(2026, 4, 3, 12, 2, tzinfo=timezone.utc),
                primary_used=84.0,
                secondary_used=94.0,
                primary_reset=shared_primary_reset,
                secondary_reset=shared_secondary_reset,
            ),
        ],
    )

    first = _run_once()
    second = _run_once()
    assert first == second
    assert first == {account_a.id: 1, account_b.id: 1, account_c.id: 1}
