## Why

`GET /live_usage` can still show active Codex processes as unattributed when a terminal runs with `CODEX_AUTH_JSON_PATH=.../auth.json` but no snapshot marker (`current` / `CODEX_AUTH_ACTIVE_SNAPSHOT`).

Operators can already infer the email identity from that auth file, but the session remains unattributed and the snapshot list is not self-healing.

## What Changes

- Extend live process snapshot attribution to infer a snapshot name from `auth.json` email identity when explicit snapshot markers are missing.
- Materialize a matching snapshot file in `~/.codex/accounts` (same as manual `codex-auth save` behavior) when needed.
- Keep attribution stable by reusing existing snapshot ownership when available and only creating a new email-derived snapshot when no mapping exists.
- Prioritize active snapshots first in `/live_usage` XML ordering so live snapshots appear at the top.
- For mapped live sessions, derive snapshot task previews from live session task data (not stale persisted account previews).
- When multiple unlabeled pre-switch processes exist and previous active snapshot metadata is present, map them to that previous snapshot instead of leaving them unattributed.

## Impact

- Fewer `unattributed_sessions` in `/live_usage` for known-auth sessions.
- New email-auth sessions become visible in snapshot-based observability without manual snapshot save.
- `/live_usage` task previews stay aligned with currently mapped live sessions.
- Backward compatible: existing explicit snapshot mappings continue to win.
