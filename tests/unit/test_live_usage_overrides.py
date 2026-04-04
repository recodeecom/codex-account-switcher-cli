from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.core.crypto import TokenEncryptor
from app.db.models import Account, AccountStatus, UsageHistory
from app.modules.accounts.codex_auth_switcher import CodexAuthSnapshotIndex
from app.modules.accounts.codex_live_usage import LocalCodexLiveUsage, LocalUsageWindow
from app.modules.accounts.live_usage_overrides import (
    apply_local_live_usage_overrides,
    _apply_local_default_session_fingerprint_overrides,
    _match_sample_to_account,
    _resolve_sample_account_assignments,
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
    reset_at: int,
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


def _sample(*, used_percent: float, reset_at: int) -> LocalCodexLiveUsage:
    return LocalCodexLiveUsage(
        recorded_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
        active_session_count=1,
        primary=LocalUsageWindow(used_percent=used_percent, reset_at=reset_at, window_minutes=300),
        secondary=LocalUsageWindow(used_percent=used_percent, reset_at=reset_at + 3_600, window_minutes=10_080),
    )


def test_apply_local_live_usage_overrides_marks_snapshot_live_from_process_mapping(
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
    codex_live_session_counts_by_account = {account.id: 0}

    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.read_local_codex_live_usage_by_snapshot",
        lambda: {},
    )
    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.read_live_codex_process_session_counts_by_snapshot",
        lambda: {"snap-a": 1},
    )

    candidates = apply_local_live_usage_overrides(
        accounts=[account],
        snapshot_index=snapshot_index,
        codex_auth_by_account=codex_auth_by_account,
        primary_usage=primary_usage,
        secondary_usage=secondary_usage,
        codex_live_session_counts_by_account=codex_live_session_counts_by_account,
    )

    assert candidates == []
    assert codex_auth_by_account[account.id].has_live_session is True
    assert codex_live_session_counts_by_account[account.id] == 1


def test_fallback_fingerprint_matching_updates_session_counts_and_overrides_usage_when_reset_is_unique(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={
            account_a.id: ["snap-a"],
            account_b.id: ["snap-b"],
        },
        active_snapshot_name="snap-a",
    )

    codex_auth_by_account = {
        account_a.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="snap-a",
            active_snapshot_name="snap-a",
            is_active_snapshot=True,
            has_live_session=False,
        ),
        account_b.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="snap-b",
            active_snapshot_name="snap-a",
            is_active_snapshot=False,
            has_live_session=False,
        ),
    }

    baseline_primary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="primary",
            used_percent=91.0,
            reset_at=1_717_000_100,
            window_minutes=300,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="primary",
            used_percent=47.0,
            reset_at=1_717_000_900,
            window_minutes=300,
        ),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="secondary",
            used_percent=62.0,
            reset_at=1_717_003_700,
            window_minutes=10_080,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="secondary",
            used_percent=34.0,
            reset_at=1_717_004_500,
            window_minutes=10_080,
        ),
    }

    primary_usage = dict(baseline_primary)
    secondary_usage = dict(baseline_secondary)
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
            _sample(used_percent=90.0, reset_at=1_717_000_100),
            _sample(used_percent=48.0, reset_at=1_717_000_900),
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
    )

    assert primary_usage[account_a.id].used_percent == 90.0
    assert primary_usage[account_a.id].reset_at == 1_717_000_100
    assert primary_usage[account_b.id].used_percent == 48.0
    assert primary_usage[account_b.id].reset_at == 1_717_000_900
    assert secondary_usage[account_a.id].used_percent == 90.0
    assert secondary_usage[account_a.id].reset_at == 1_717_003_700
    assert secondary_usage[account_b.id].used_percent == 48.0
    assert secondary_usage[account_b.id].reset_at == 1_717_004_500


def test_fallback_fingerprint_matching_keeps_quota_baseline_when_reset_is_not_unique(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={
            account_a.id: ["snap-a"],
            account_b.id: ["snap-b"],
        },
        active_snapshot_name="snap-a",
    )

    codex_auth_by_account = {
        account_a.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="snap-a",
            active_snapshot_name="snap-a",
            is_active_snapshot=True,
            has_live_session=False,
        ),
        account_b.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="snap-b",
            active_snapshot_name="snap-a",
            is_active_snapshot=False,
            has_live_session=False,
        ),
    }

    baseline_primary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="primary",
            used_percent=91.0,
            reset_at=1_717_000_100,
            window_minutes=300,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="primary",
            used_percent=47.0,
            reset_at=1_717_000_100,
            window_minutes=300,
        ),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="secondary",
            used_percent=62.0,
            reset_at=1_717_003_700,
            window_minutes=10_080,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="secondary",
            used_percent=34.0,
            reset_at=1_717_003_700,
            window_minutes=10_080,
        ),
    }

    primary_usage = dict(baseline_primary)
    secondary_usage = dict(baseline_secondary)
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
            _sample(used_percent=90.0, reset_at=1_717_000_100),
            _sample(used_percent=48.0, reset_at=1_717_000_100),
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
    )

    assert primary_usage[account_a.id].used_percent == baseline_primary[account_a.id].used_percent
    assert primary_usage[account_b.id].used_percent == baseline_primary[account_b.id].used_percent
    assert secondary_usage[account_a.id].used_percent == baseline_secondary[account_a.id].used_percent
    assert secondary_usage[account_b.id].used_percent == baseline_secondary[account_b.id].used_percent


def test_match_sample_uses_reset_fingerprint_when_percent_gap_is_ambiguous() -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    baseline_primary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="primary",
            used_percent=52.0,
            reset_at=1_717_000_100,
            window_minutes=300,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="primary",
            used_percent=52.0,
            reset_at=1_717_003_600,
            window_minutes=300,
        ),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="secondary",
            used_percent=38.0,
            reset_at=1_717_000_000,
            window_minutes=10_080,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="secondary",
            used_percent=38.0,
            reset_at=1_717_007_200,
            window_minutes=10_080,
        ),
    }

    sample = _sample(used_percent=52.0, reset_at=1_717_003_600)
    matched = _match_sample_to_account(
        sample=sample,
        accounts=accounts,
        baseline_primary_usage=baseline_primary,
        baseline_secondary_usage=baseline_secondary,
    )

    assert matched == account_b.id


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

    assert matched == account_b.id


def test_fallback_fingerprint_matching_spreads_ambiguous_samples_for_live_recall(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account_a = _make_account("acc-a", "a@example.com")
    account_b = _make_account("acc-b", "b@example.com")
    accounts = [account_a, account_b]

    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={
            account_a.id: ["snap-a"],
            account_b.id: ["snap-b"],
        },
        active_snapshot_name="snap-a",
    )

    codex_auth_by_account = {
        account_a.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="snap-a",
            active_snapshot_name="snap-a",
            is_active_snapshot=True,
            has_live_session=False,
        ),
        account_b.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name="snap-b",
            active_snapshot_name="snap-a",
            is_active_snapshot=False,
            has_live_session=False,
        ),
    }

    baseline_primary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="primary",
            used_percent=50.0,
            reset_at=1_717_000_100,
            window_minutes=300,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="primary",
            used_percent=80.0,
            reset_at=1_717_000_100,
            window_minutes=300,
        ),
    }
    baseline_secondary = {
        account_a.id: _usage_entry(
            account_id=account_a.id,
            window="secondary",
            used_percent=50.0,
            reset_at=1_717_003_700,
            window_minutes=10_080,
        ),
        account_b.id: _usage_entry(
            account_id=account_b.id,
            window="secondary",
            used_percent=80.0,
            reset_at=1_717_003_700,
            window_minutes=10_080,
        ),
    }

    primary_usage = dict(baseline_primary)
    secondary_usage = dict(baseline_secondary)
    live_usage_by_snapshot = {
        "snap-a": LocalCodexLiveUsage(
            recorded_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
            active_session_count=2,
            primary=LocalUsageWindow(used_percent=51.0, reset_at=1_717_000_500, window_minutes=300),
            secondary=LocalUsageWindow(used_percent=51.0, reset_at=1_717_004_100, window_minutes=10_080),
        )
    }

    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.read_local_codex_live_usage_samples",
        lambda: [
            _sample(used_percent=49.0, reset_at=1_717_000_100),
            _sample(used_percent=52.0, reset_at=1_717_000_100),
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
    )
    assert primary_usage[account_a.id].used_percent == baseline_primary[account_a.id].used_percent
    assert primary_usage[account_b.id].used_percent == baseline_primary[account_b.id].used_percent
    assert secondary_usage[account_a.id].used_percent == baseline_secondary[account_a.id].used_percent
    assert secondary_usage[account_b.id].used_percent == baseline_secondary[account_b.id].used_percent


def test_global_assignment_is_deterministic_across_account_and_sample_order() -> None:
    accounts = [_make_account(f"acc-{idx}", f"user{idx}@example.com") for idx in range(1, 6)]
    baseline_primary = {}
    baseline_secondary = {}
    codex_auth_by_account: dict[str, AccountCodexAuthStatus] = {}
    for idx, account in enumerate(accounts, start=1):
        baseline_primary[account.id] = _usage_entry(
            account_id=account.id,
            window="primary",
            used_percent=float(idx * 10),
            reset_at=1_800_000_000,
            window_minutes=300,
        )
        baseline_secondary[account.id] = _usage_entry(
            account_id=account.id,
            window="secondary",
            used_percent=float(idx * 10),
            reset_at=1_800_003_600,
            window_minutes=10_080,
        )
        codex_auth_by_account[account.id] = AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name=f"snap-{idx}",
            active_snapshot_name="snap-1",
            is_active_snapshot=idx == 1,
            has_live_session=False,
        )

    samples = [
        _sample(used_percent=11.0, reset_at=1_800_000_000),
        _sample(used_percent=19.0, reset_at=1_800_000_000),
        _sample(used_percent=31.0, reset_at=1_800_000_000),
        _sample(used_percent=41.0, reset_at=1_800_000_000),
        _sample(used_percent=49.0, reset_at=1_800_000_000),
    ]

    first = _resolve_sample_account_assignments(
        samples=samples,
        accounts=accounts,
        codex_auth_by_account=codex_auth_by_account,
        baseline_primary_usage=baseline_primary,
        baseline_secondary_usage=baseline_secondary,
    )
    first_mapping = {samples[idx].primary.used_percent: account_id for idx, account_id in first.items()}

    second = _resolve_sample_account_assignments(
        samples=list(reversed(samples)),
        accounts=list(reversed(accounts)),
        codex_auth_by_account=codex_auth_by_account,
        baseline_primary_usage=baseline_primary,
        baseline_secondary_usage=baseline_secondary,
    )
    reversed_samples = list(reversed(samples))
    second_mapping = {reversed_samples[idx].primary.used_percent: account_id for idx, account_id in second.items()}

    assert first_mapping == second_mapping


def test_presence_only_samples_use_recall_fallback_without_quota_override(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    accounts = [_make_account(f"acc-{idx}", f"user{idx}@example.com") for idx in range(1, 4)]
    snapshot_index = CodexAuthSnapshotIndex(
        snapshots_by_account_id={account.id: [f"snap-{idx}"] for idx, account in enumerate(accounts, start=1)},
        active_snapshot_name="snap-1",
    )
    codex_auth_by_account = {
        account.id: AccountCodexAuthStatus(
            has_snapshot=True,
            snapshot_name=f"snap-{idx}",
            active_snapshot_name="snap-1",
            is_active_snapshot=idx == 1,
            has_live_session=False,
        )
        for idx, account in enumerate(accounts, start=1)
    }

    baseline_primary = {
        account.id: _usage_entry(
            account_id=account.id,
            window="primary",
            used_percent=float(idx * 12),
            reset_at=1_900_000_000 + (idx * 60),
            window_minutes=300,
        )
        for idx, account in enumerate(accounts, start=1)
    }
    baseline_secondary = {
        account.id: _usage_entry(
            account_id=account.id,
            window="secondary",
            used_percent=float(idx * 9),
            reset_at=1_900_003_600 + (idx * 60),
            window_minutes=10_080,
        )
        for idx, account in enumerate(accounts, start=1)
    }

    primary_usage = dict(baseline_primary)
    secondary_usage = dict(baseline_secondary)
    now = datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc)
    live_usage_by_snapshot = {
        "snap-1": LocalCodexLiveUsage(
            recorded_at=now,
            active_session_count=3,
            primary=LocalUsageWindow(used_percent=25.0, reset_at=1_900_010_000, window_minutes=300),
            secondary=LocalUsageWindow(used_percent=35.0, reset_at=1_900_013_600, window_minutes=10_080),
        )
    }

    monkeypatch.setattr(
        "app.modules.accounts.live_usage_overrides.read_local_codex_live_usage_samples",
        lambda: [
            LocalCodexLiveUsage(recorded_at=now, active_session_count=1, primary=None, secondary=None),
            LocalCodexLiveUsage(recorded_at=now, active_session_count=1, primary=None, secondary=None),
            LocalCodexLiveUsage(recorded_at=now, active_session_count=1, primary=None, secondary=None),
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
    )
    for account in accounts:
        assert primary_usage[account.id].used_percent == baseline_primary[account.id].used_percent
        assert secondary_usage[account.id].used_percent == baseline_secondary[account.id].used_percent
