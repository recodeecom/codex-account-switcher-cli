## Why
Accounts with no weekly quota remaining can still show an enabled `Use this` / `Use this account` action as long as 5h quota remains. This allows selecting accounts that are already blocked by the weekly limit.

## What Changes
- Keep the baseline weekly quota guard (`<1%`) in shared gating utilities.
- Add a dashboard-card hard stop that disables `Use this account` whenever the weekly badge is shown as `0%` (including near-zero values rounded down for display).
- Apply that `0%` display-aligned guard even for working-now accounts.
- Add regression tests for weekly-depleted and near-zero weekly display gating in dashboard card coverage.

## Impact
- Prevents selecting accounts that are exhausted for the weekly quota window.
- Keeps UI behavior aligned with practical account usability.
