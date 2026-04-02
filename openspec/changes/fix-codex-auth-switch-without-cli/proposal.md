## Why
In Docker/dev environments the `codex-auth` binary may be unavailable even when snapshot files exist. This causes account switching from the dashboard to fail with `codex-auth is not installed`.

## What Changes
- Add a backend fallback switch path that updates `CODEX_AUTH_CURRENT_PATH` and `CODEX_AUTH_JSON_PATH` directly when `codex-auth` CLI is unavailable.
- Keep existing CLI-based switching as the first path when `codex-auth` is installed.
- Make local docker-compose `.codex` mount writable so switch updates can persist.

## Impact
- Dashboard "Use this" can succeed without `codex-auth` CLI when snapshot files are present.
- Existing error behavior remains for truly unrecoverable cases (missing snapshot / unwritable paths).
