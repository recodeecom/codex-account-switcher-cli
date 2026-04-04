## Why

Dashboard and Accounts views currently synthesize `5h = 100%` when the primary reset time is in the past.
With multiple accounts this can misrepresent real per-account usage and make stale accounts look fully refreshed.

Operators need `5h` to reflect real account telemetry (or unknown) instead of an inferred full reset.

## What Changes

- Stop frontend-only `5h -> 100%` fallback when reset has passed.
- Stop backend defaulting missing non-weekly primary usage to `100%`.
- Keep `primaryRemainingPercent` nullable when no primary sample is present.
- Preserve existing weekly-only mapping behavior.
- Keep local-switch eligibility strict for non-working accounts: unknown `5h` remains ineligible.

## Impact

- `Working now` and account rows show true per-account `5h` state instead of synthetic `100%`.
- Missing primary telemetry is shown as unknown (`--`) consistently.
- No API schema changes (behavioral value semantics only).
