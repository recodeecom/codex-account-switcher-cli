## Why
Accounts with no weekly quota remaining can still show an enabled `Use this` / `Use this account` action as long as 5h quota remains. This allows selecting accounts that are already blocked by the weekly limit.

## What Changes
- Extend local account switch gating to also require at least 1% weekly remaining quota (when weekly quota is known).
- Apply weekly gating even for working-now accounts so `Use this account` cannot be used when weekly quota is 0%.
- Add regression tests for weekly-depleted gating in utility and dashboard card coverage.

## Impact
- Prevents selecting accounts that are exhausted for the weekly quota window.
- Keeps UI behavior aligned with practical account usability.
