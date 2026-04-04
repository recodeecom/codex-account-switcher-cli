from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from app.core.utils.time import to_utc_naive
from app.db.models import Account, UsageHistory
from app.modules.accounts.codex_auth_switcher import CodexAuthSnapshotIndex
from app.modules.accounts.codex_live_usage import (
    LocalCodexLiveUsage,
    LocalUsageWindow,
    has_recent_active_snapshot_process_fallback,
    read_local_codex_live_usage_by_snapshot,
    read_local_codex_live_usage_samples,
)
from app.modules.accounts.schemas import AccountCodexAuthStatus


@dataclass(frozen=True)
class LiveUsageOverridePersistCandidate:
    account_id: str
    window: Literal["primary", "secondary"]
    used_percent: float
    reset_at: int | None
    window_minutes: int | None
    recorded_at: datetime

_RESET_FINGERPRINT_MATCH_TOLERANCE_SECONDS = 30


def apply_local_live_usage_overrides(
    *,
    accounts: list[Account],
    snapshot_index: CodexAuthSnapshotIndex,
    codex_auth_by_account: dict[str, AccountCodexAuthStatus],
    primary_usage: dict[str, UsageHistory],
    secondary_usage: dict[str, UsageHistory],
    codex_session_counts_by_account: dict[str, int],
) -> list[LiveUsageOverridePersistCandidate]:
    baseline_primary_usage = dict(primary_usage)
    baseline_secondary_usage = dict(secondary_usage)
    persist_candidates: list[LiveUsageOverridePersistCandidate] = []
    live_usage_by_snapshot = read_local_codex_live_usage_by_snapshot()
    has_recent_process_fallback = has_recent_active_snapshot_process_fallback()
    should_defer_active_snapshot_usage = _should_defer_active_snapshot_usage_override(
        accounts=accounts,
        snapshot_index=snapshot_index,
        codex_auth_by_account=codex_auth_by_account,
        live_usage_by_snapshot=live_usage_by_snapshot,
    )

    for account in accounts:
        codex_auth_status = codex_auth_by_account.get(account.id)
        if codex_auth_status is None:
            continue

        snapshot_names = snapshot_index.snapshots_by_account_id.get(account.id, [])
        live_usage = _resolve_live_usage_for_account(
            snapshot_names=snapshot_names,
            selected_snapshot_name=codex_auth_status.snapshot_name,
            live_usage_by_snapshot=live_usage_by_snapshot,
        )
        has_live_telemetry = bool(live_usage and live_usage.active_session_count > 0)
        codex_auth_status.has_live_session = has_live_telemetry
        account_id = account.id
        if not has_live_telemetry or live_usage is None:
            if has_recent_process_fallback and codex_auth_status.is_active_snapshot:
                codex_auth_status.has_live_session = True
                codex_session_counts_by_account[account_id] = max(
                    1,
                    codex_session_counts_by_account.get(account_id, 0),
                )
            continue

        if should_defer_active_snapshot_usage and codex_auth_status.is_active_snapshot:
            # The default sessions directory can include active sessions from
            # multiple snapshots. When that mixed telemetry cannot be reliably
            # split yet, keep quota windows on their baseline account values
            # instead of attributing another snapshot's limits to the active
            # account. Also clamp to presence-only to avoid inflating counts
            # from stale or cross-account default-session files.
            codex_session_counts_by_account[account_id] = 1
            continue
        codex_session_counts_by_account[account_id] = max(0, live_usage.active_session_count)

        recorded_at = to_utc_naive(live_usage.recorded_at)
        if live_usage.primary is not None:
            primary_usage[account_id] = _usage_history_from_live_window(
                account_id=account_id,
                window="primary",
                recorded_at=recorded_at,
                usage_window=live_usage.primary,
            )
            persist_candidates.append(
                LiveUsageOverridePersistCandidate(
                    account_id=account_id,
                    window="primary",
                    used_percent=float(live_usage.primary.used_percent),
                    reset_at=live_usage.primary.reset_at,
                    window_minutes=live_usage.primary.window_minutes,
                    recorded_at=recorded_at,
                )
            )
        if live_usage.secondary is not None:
            secondary_usage[account_id] = _usage_history_from_live_window(
                account_id=account_id,
                window="secondary",
                recorded_at=recorded_at,
                usage_window=live_usage.secondary,
            )
            persist_candidates.append(
                LiveUsageOverridePersistCandidate(
                    account_id=account_id,
                    window="secondary",
                    used_percent=float(live_usage.secondary.used_percent),
                    reset_at=live_usage.secondary.reset_at,
                    window_minutes=live_usage.secondary.window_minutes,
                    recorded_at=recorded_at,
                )
            )

    _apply_local_default_session_fingerprint_overrides(
        accounts=accounts,
        snapshot_index=snapshot_index,
        live_usage_by_snapshot=live_usage_by_snapshot,
        codex_auth_by_account=codex_auth_by_account,
        baseline_primary_usage=baseline_primary_usage,
        baseline_secondary_usage=baseline_secondary_usage,
        primary_usage=primary_usage,
        secondary_usage=secondary_usage,
        codex_session_counts_by_account=codex_session_counts_by_account,
    )
    return _coalesce_persist_candidates(persist_candidates)


def _coalesce_persist_candidates(
    candidates: list[LiveUsageOverridePersistCandidate],
) -> list[LiveUsageOverridePersistCandidate]:
    latest_by_key: dict[tuple[str, str], LiveUsageOverridePersistCandidate] = {}
    for candidate in candidates:
        key = (candidate.account_id, candidate.window)
        existing = latest_by_key.get(key)
        if existing is None or candidate.recorded_at >= existing.recorded_at:
            latest_by_key[key] = candidate
    return list(latest_by_key.values())


def _resolve_live_usage_for_account(
    *,
    snapshot_names: list[str],
    selected_snapshot_name: str | None,
    live_usage_by_snapshot: dict[str, LocalCodexLiveUsage],
) -> LocalCodexLiveUsage | None:
    candidate_names = [name for name in [selected_snapshot_name, *snapshot_names] if name]
    merged: LocalCodexLiveUsage | None = None
    seen: set[str] = set()
    for snapshot_name in candidate_names:
        if snapshot_name in seen:
            continue
        seen.add(snapshot_name)
        usage = live_usage_by_snapshot.get(snapshot_name)
        if usage is None:
            continue
        merged = _merge_live_usage(merged, usage)
    return merged


def _merge_live_usage(previous: LocalCodexLiveUsage | None, current: LocalCodexLiveUsage) -> LocalCodexLiveUsage:
    if previous is None:
        return current

    prefer_current = current.recorded_at >= previous.recorded_at
    preferred = current if prefer_current else previous
    fallback = previous if prefer_current else current

    return LocalCodexLiveUsage(
        recorded_at=max(previous.recorded_at, current.recorded_at),
        active_session_count=max(0, previous.active_session_count) + max(0, current.active_session_count),
        primary=preferred.primary if preferred.primary is not None else fallback.primary,
        secondary=preferred.secondary if preferred.secondary is not None else fallback.secondary,
    )


def _usage_history_from_live_window(
    *,
    account_id: str,
    window: str,
    recorded_at: datetime,
    usage_window: LocalUsageWindow,
) -> UsageHistory:
    return UsageHistory(
        account_id=account_id,
        window=window,
        used_percent=float(usage_window.used_percent),
        reset_at=usage_window.reset_at,
        window_minutes=usage_window.window_minutes,
        recorded_at=recorded_at,
    )


def _apply_local_default_session_fingerprint_overrides(
    *,
    accounts: list[Account],
    snapshot_index: CodexAuthSnapshotIndex,
    live_usage_by_snapshot: dict[str, LocalCodexLiveUsage],
    codex_auth_by_account: dict[str, AccountCodexAuthStatus],
    baseline_primary_usage: dict[str, UsageHistory],
    baseline_secondary_usage: dict[str, UsageHistory],
    primary_usage: dict[str, UsageHistory],
    secondary_usage: dict[str, UsageHistory],
    codex_session_counts_by_account: dict[str, int],
) -> None:
    active_snapshot_name = snapshot_index.active_snapshot_name
    if not active_snapshot_name:
        return
    active_snapshot_live_usage = live_usage_by_snapshot.get(active_snapshot_name)
    if active_snapshot_live_usage is None:
        return
    if len(live_usage_by_snapshot) != 1 or active_snapshot_live_usage.active_session_count <= 1:
        return

    samples = read_local_codex_live_usage_samples()
    if len(samples) <= 1:
        return
    fingerprint_samples = [sample for sample in samples if _sample_has_fingerprint(sample)]
    if len(fingerprint_samples) <= 1:
        return

    candidate_accounts = [
        account
        for account in accounts
        if _account_has_snapshot(codex_auth_by_account.get(account.id))
        and _account_has_usage_fingerprint(
            account_id=account.id,
            baseline_primary_usage=baseline_primary_usage,
            baseline_secondary_usage=baseline_secondary_usage,
        )
    ]
    if len(candidate_accounts) <= 1:
        return

    matched_counts_by_account: dict[str, int] = {}
    latest_sample_by_account: dict[str, LocalCodexLiveUsage] = {}
    for sample in fingerprint_samples:
        account_id = _resolve_unique_reset_match_account_id(
            sample=sample,
            accounts=candidate_accounts,
            baseline_primary_usage=baseline_primary_usage,
            baseline_secondary_usage=baseline_secondary_usage,
        )
        if account_id is None:
            continue
        matched_counts_by_account[account_id] = matched_counts_by_account.get(account_id, 0) + 1
        previous_sample = latest_sample_by_account.get(account_id)
        if previous_sample is None or sample.recorded_at >= previous_sample.recorded_at:
            latest_sample_by_account[account_id] = sample

    if not matched_counts_by_account:
        return

    for account in accounts:
        account_id = account.id
        match_count = matched_counts_by_account.get(account_id)
        if not match_count:
            continue

        codex_auth_status = codex_auth_by_account.get(account_id)
        if codex_auth_status is not None:
            codex_auth_status.has_live_session = True

        codex_session_counts_by_account[account_id] = match_count
        latest_sample = latest_sample_by_account.get(account_id)
        if latest_sample is None:
            continue

        if not _has_unique_reset_fingerprint_match(
            sample=latest_sample,
            account_id=account_id,
            accounts=candidate_accounts,
            baseline_primary_usage=baseline_primary_usage,
            baseline_secondary_usage=baseline_secondary_usage,
        ):
            # Without a unique reset fingerprint we can still trust session
            # presence/count, but quota attribution may bleed across accounts.
            continue

        recorded_at = to_utc_naive(latest_sample.recorded_at)
        if latest_sample.primary is not None:
            primary_usage[account_id] = _usage_history_from_live_window(
                account_id=account_id,
                window="primary",
                recorded_at=recorded_at,
                usage_window=latest_sample.primary,
            )
        if latest_sample.secondary is not None:
            secondary_usage[account_id] = _usage_history_from_live_window(
                account_id=account_id,
                window="secondary",
                recorded_at=recorded_at,
                usage_window=latest_sample.secondary,
            )


def _account_has_snapshot(status: AccountCodexAuthStatus | None) -> bool:
    return bool(status and status.has_snapshot)


def _should_defer_active_snapshot_usage_override(
    *,
    accounts: list[Account],
    snapshot_index: CodexAuthSnapshotIndex,
    codex_auth_by_account: dict[str, AccountCodexAuthStatus],
    live_usage_by_snapshot: dict[str, LocalCodexLiveUsage],
) -> bool:
    active_snapshot_name = snapshot_index.active_snapshot_name
    if not active_snapshot_name:
        return False

    active_snapshot_live_usage = live_usage_by_snapshot.get(active_snapshot_name)
    if active_snapshot_live_usage is None:
        return False

    if len(live_usage_by_snapshot) != 1 or active_snapshot_live_usage.active_session_count <= 1:
        return False

    accounts_with_snapshot = sum(
        1
        for account in accounts
        if _account_has_snapshot(codex_auth_by_account.get(account.id))
    )
    return accounts_with_snapshot > 1


def _account_has_usage_fingerprint(
    *,
    account_id: str,
    baseline_primary_usage: dict[str, UsageHistory],
    baseline_secondary_usage: dict[str, UsageHistory],
) -> bool:
    primary_entry = baseline_primary_usage.get(account_id)
    secondary_entry = baseline_secondary_usage.get(account_id)
    if primary_entry is not None:
        if primary_entry.reset_at is not None:
            return True
        if primary_entry.used_percent is not None:
            return True
    if secondary_entry is not None:
        if secondary_entry.reset_at is not None:
            return True
        if secondary_entry.used_percent is not None:
            return True
    return False


def _has_unique_reset_fingerprint_match(
    *,
    sample: LocalCodexLiveUsage,
    account_id: str,
    accounts: list[Account],
    baseline_primary_usage: dict[str, UsageHistory],
    baseline_secondary_usage: dict[str, UsageHistory],
) -> bool:
    sample_primary_reset = sample.primary.reset_at if sample.primary is not None else None
    sample_secondary_reset = sample.secondary.reset_at if sample.secondary is not None else None

    def _matching_accounts_for_reset(*, window: Literal["primary", "secondary"], reset_at: int) -> set[str]:
        matches: set[str] = set()
        for account in accounts:
            account_usage = (
                baseline_primary_usage.get(account.id)
                if window == "primary"
                else baseline_secondary_usage.get(account.id)
            )
            account_reset_at = account_usage.reset_at if account_usage is not None else None
            if account_reset_at is None:
                continue
            if abs(reset_at - account_reset_at) <= _RESET_FINGERPRINT_MATCH_TOLERANCE_SECONDS:
                matches.add(account.id)
        return matches

    if sample_primary_reset is not None:
        primary_matches = _matching_accounts_for_reset(window="primary", reset_at=sample_primary_reset)
        if account_id in primary_matches and len(primary_matches) == 1:
            return True

    if sample_secondary_reset is not None:
        secondary_matches = _matching_accounts_for_reset(window="secondary", reset_at=sample_secondary_reset)
        if account_id in secondary_matches and len(secondary_matches) == 1:
            return True

    return False


def _sample_has_fingerprint(sample: LocalCodexLiveUsage) -> bool:
    primary_reset = sample.primary.reset_at if sample.primary is not None else None
    secondary_reset = sample.secondary.reset_at if sample.secondary is not None else None
    return (
        primary_reset is not None
        or secondary_reset is not None
        or sample.primary is not None
        or sample.secondary is not None
    )


def _match_sample_to_account(
    *,
    sample: LocalCodexLiveUsage,
    accounts: list[Account],
    baseline_primary_usage: dict[str, UsageHistory],
    baseline_secondary_usage: dict[str, UsageHistory],
) -> str | None:
    return _resolve_unique_reset_match_account_id(
        sample=sample,
        accounts=accounts,
        baseline_primary_usage=baseline_primary_usage,
        baseline_secondary_usage=baseline_secondary_usage,
    )


def _resolve_unique_reset_match_account_id(
    *,
    sample: LocalCodexLiveUsage,
    accounts: list[Account],
    baseline_primary_usage: dict[str, UsageHistory],
    baseline_secondary_usage: dict[str, UsageHistory],
) -> str | None:
    primary_reset = sample.primary.reset_at if sample.primary is not None else None
    secondary_reset = sample.secondary.reset_at if sample.secondary is not None else None

    def _match_accounts_for_reset(*, window: Literal["primary", "secondary"], reset_at: int) -> set[str]:
        matches: set[str] = set()
        for account in accounts:
            usage_entry = (
                baseline_primary_usage.get(account.id)
                if window == "primary"
                else baseline_secondary_usage.get(account.id)
            )
            usage_reset_at = usage_entry.reset_at if usage_entry is not None else None
            if usage_reset_at is None:
                continue
            if abs(reset_at - usage_reset_at) <= _RESET_FINGERPRINT_MATCH_TOLERANCE_SECONDS:
                matches.add(account.id)
        return matches

    primary_unique: str | None = None
    if primary_reset is not None:
        primary_matches = _match_accounts_for_reset(window="primary", reset_at=primary_reset)
        if len(primary_matches) == 1:
            primary_unique = next(iter(primary_matches))

    secondary_unique: str | None = None
    if secondary_reset is not None:
        secondary_matches = _match_accounts_for_reset(window="secondary", reset_at=secondary_reset)
        if len(secondary_matches) == 1:
            secondary_unique = next(iter(secondary_matches))

    if primary_unique and secondary_unique:
        if primary_unique == secondary_unique:
            return primary_unique
        return None

    return primary_unique or secondary_unique
