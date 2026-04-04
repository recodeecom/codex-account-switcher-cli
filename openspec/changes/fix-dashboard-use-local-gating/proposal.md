## Why
Dashboard account cards can show a healthy 5h quota bar while the `Use this account` action remains disabled because gating reads a different quota source than the rendered bar.

## What Changes
- Align dashboard `Use this account` enable/disable gating with the same normalized 5h quota value used by the rendered 5h bar.
- Add a regression test that verifies button gating stays aligned with displayed 5h quota across floor-cache carryover between renders.

## Impact
- Operators will not see contradictory card state (healthy 5h bar with disabled `Use this account`).
- No backend API or routing behavior changes.
