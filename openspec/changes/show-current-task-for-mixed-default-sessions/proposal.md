## Why
When sticky codex-session mappings are empty, `/sessions` falls back to dashboard overview telemetry.  
In mixed default-session mode, only the active snapshot account currently gets a live task preview, while other accounts often show `—` even when they have active session telemetry.

## What Changes
- Extend live task preview overlay logic to also resolve previews from active rollout session sources attributed to each account (not only from selected snapshot name).
- Keep existing snapshot-based preview behavior as the first priority.
- Backfill `codexCurrentTaskPreview` for both `/api/accounts` and `/api/dashboard/overview` when mixed default-session telemetry is present.
- Add integration coverage proving that two accounts in mixed default-session mode each receive their own current task preview.

## Impact
- `/sessions` fallback table can show a current task for all active session rows, not just the currently selected snapshot account.
- No API shape changes; behavior improves within existing fields.
