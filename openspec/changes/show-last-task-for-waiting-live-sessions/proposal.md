## Why
Operators can already see active Codex task previews, but live sessions that temporarily go idle collapse to `Waiting for new task` with no retained context. That makes it harder to understand what the session last worked on, especially in the dashboard overview fallback and the raw `/live_usage` XML feed.

## What Changes
- Preserve a separate last-known task preview for waiting live sessions in account overview payloads.
- Keep the existing waiting-state semantics for current task display, but surface the last-known task as secondary context.
- Extend `/live_usage` session rows to optionally include `last_task_preview` for waiting rows when a safe fallback exists.
- Add backend and frontend tests covering waiting-state + last-task rendering without resurrecting cleared tasks.

## Impact
- Operators keep truthful `Waiting for new task` status while still seeing the most recent safe task context.
- Existing active task preview logic and sticky-session task preview behavior remain unchanged.
- XML counters and waiting-state semantics stay stable; the new attribute is additive.
