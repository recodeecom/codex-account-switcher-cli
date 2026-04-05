## Overview
Add a second task-preview channel for live sessions that are currently idle. The primary current-task field keeps its existing semantics (`Waiting for new task` when no active task preview exists), while a new optional last-task field carries the most recent safe preview that can still be attributed to the account or snapshot.

## Backend approach
- Extend account summary payloads with `codex_last_task_preview`.
- Update the task preview overlay so waiting live snapshots set `codex_current_task_preview` to the waiting label and optionally populate `codex_last_task_preview` from existing sanitized local preview sources.
- Update `/live_usage` XML rendering so waiting `<session>` rows can emit `last_task_preview="..."` when a non-ambiguous fallback exists.
- Do not reuse stale previews after explicit clear/status-only messages; fallback remains constrained by the current sanitization and preview extraction rules.

## Frontend approach
- Dashboard cards keep the current task headline unchanged, but render a muted `Last task: ...` line when the current task is the waiting label and a last-task preview exists.
- Sessions page fallback rows do the same for account overview-derived rows.
- Sticky-session rows remain unchanged unless they already expose explicit task preview data.

## Risk controls
- Only use secondary last-task fallback for waiting rows; never replace the waiting label.
- Avoid ambiguous XML backfill for snapshots with multiple waiting sessions unless a safe per-session fallback exists.
- Keep working-now detection based on the existing current-task/live-session signals, not the new last-task field.
