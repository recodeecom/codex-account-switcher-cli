from __future__ import annotations

from datetime import datetime

from app.db.models import Account
from app.modules.accounts.codex_live_usage import (
    LocalCodexTaskPreview,
    read_local_codex_task_previews_by_session_id,
    read_local_codex_task_previews_by_snapshot,
)
from app.modules.accounts.schemas import AccountCodexAuthStatus, AccountLiveQuotaDebug


def overlay_live_codex_task_previews(
    *,
    accounts: list[Account],
    codex_auth_by_account: dict[str, AccountCodexAuthStatus],
    codex_current_task_preview_by_account: dict[str, str],
    live_quota_debug_by_account: dict[str, AccountLiveQuotaDebug] | None,
    now: datetime,
) -> None:
    previews_by_snapshot = read_local_codex_task_previews_by_snapshot(now=now)
    previews_by_session_id = read_local_codex_task_previews_by_session_id(now=now)

    if not previews_by_snapshot and not previews_by_session_id:
        return

    for account in accounts:
        if codex_current_task_preview_by_account.get(account.id):
            continue

        codex_auth_status = codex_auth_by_account.get(account.id)
        if codex_auth_status is not None:
            snapshot_name = codex_auth_status.snapshot_name
            if snapshot_name:
                preview = previews_by_snapshot.get(snapshot_name)
                if preview is not None:
                    codex_current_task_preview_by_account[account.id] = preview.text
                    continue

        preview_from_source = _resolve_preview_from_debug_sources(
            debug=live_quota_debug_by_account.get(account.id)
            if live_quota_debug_by_account is not None
            else None,
            previews_by_session_id=previews_by_session_id,
        )
        if preview_from_source is not None:
            codex_current_task_preview_by_account[account.id] = preview_from_source.text


def _resolve_preview_from_debug_sources(
    *,
    debug: AccountLiveQuotaDebug | None,
    previews_by_session_id: dict[str, LocalCodexTaskPreview],
) -> LocalCodexTaskPreview | None:
    if debug is None or not debug.raw_samples:
        return None

    best_preview: LocalCodexTaskPreview | None = None

    for allow_stale in (False, True):
        for sample in debug.raw_samples:
            if not allow_stale and sample.stale:
                continue

            source_name = sample.source.rsplit("/", 1)[-1]
            if not source_name.startswith("rollout-") or not source_name.endswith(".jsonl"):
                continue
            session_id = source_name.removesuffix(".jsonl").rsplit("-", 1)[-1]
            if len(session_id) != 36:
                continue

            preview = previews_by_session_id.get(session_id)
            if preview is None:
                continue
            if best_preview is None or preview.recorded_at > best_preview.recorded_at:
                best_preview = preview

        if best_preview is not None:
            return best_preview

    return None
