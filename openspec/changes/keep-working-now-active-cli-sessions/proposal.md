## Why

Accounts can disappear from the dashboard `Working now` section when the 5h quota rounds to `0%`, even if Codex CLI sessions are still active. Long-lived or idle CLI sessions can stay open for more than 30 minutes, so grouping should continue to prioritize those accounts.

## What Changes

- Keep accounts in `Working now` when any active CLI session signal exists (`live`, `tracked`, or compatibility session counters), even when primary 5h quota is `0%`.
- Preserve the 5h zero-floor exclusion for accounts that have no active CLI session signal.
- Update dashboard and working-detection tests to cover this behavior.

## Impact

- Operators keep active-session accounts at the top of the dashboard while sessions are still running.
- `Working now` grouping better matches real Codex CLI session lifecycle.
