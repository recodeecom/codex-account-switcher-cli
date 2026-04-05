## Why

`GET /live_usage` can still show active Codex processes as unattributed when a terminal runs with `CODEX_AUTH_JSON_PATH=.../auth.json` but no snapshot marker (`current` / `CODEX_AUTH_ACTIVE_SNAPSHOT`).

Operators can already infer the email identity from that auth file, but the session remains unattributed and the snapshot list is not self-healing.

## What Changes

- Extend live process snapshot attribution to infer a snapshot name from `auth.json` email identity when explicit snapshot markers are missing.
- Materialize a matching snapshot file in `~/.codex/accounts` (same as manual `codex-auth save` behavior) when needed.
- Keep attribution stable by reusing existing snapshot ownership when available and only creating a new email-derived snapshot when no mapping exists.

## Impact

- Fewer `unattributed_sessions` in `/live_usage` for known-auth sessions.
- New email-auth sessions become visible in snapshot-based observability without manual snapshot save.
- Backward compatible: existing explicit snapshot mappings continue to win.
