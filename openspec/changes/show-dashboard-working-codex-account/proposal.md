## Why
Operators can switch local codex-auth snapshots from the Dashboard, but the account cards do not clearly indicate which account is currently active in the local Codex runtime.

## What Changes
- Populate `accounts[].codexAuth` in `GET /api/dashboard/overview` responses using the same snapshot index logic used by account listing.
- Add a Dashboard account-card indicator badge (`Working now`) next to status when `codexAuth.isActiveSnapshot` is true.
- Refresh dashboard overview immediately after `Use this account` succeeds so the indicator updates without waiting for polling.
- Add backend/frontend test coverage for the new behavior.

## Impact
- Operators can immediately see which account is currently active for local Codex work.
- No routing, quota, or account-switch command behavior changes.
