## Why

The current **Use this** gating requires a matched local codex-auth snapshot before the action can be clicked.
This blocks a valid operator flow where an account is active and has 5h budget, but snapshot state is temporarily missing/stale.

Operators asked for availability to follow runtime readiness (active + quota), while snapshot problems should surface at switch time as actionable errors.

## What Changes

- Update account switch button gating in dashboard and accounts views to enable only when:
  - account status is active, and
  - 5h remaining quota is at least 1%.
- Remove codex-auth snapshot availability from pre-click enable/disable gating.
- Keep existing backend switch behavior unchanged (`POST /api/accounts/{id}/use-local`), including snapshot-not-found errors.
- On snapshot-not-found errors, route users to account details (`/accounts?selected=<accountId>`) for remediation.
- Align frontend tests with the new gating rule and snapshot-missing remediation path.

## Impact

- Buttons are consistently available for ready-to-use accounts based on status and quota.
- Snapshot issues are surfaced as explicit action-time errors instead of silent pre-disable state.
- No API contract changes.
