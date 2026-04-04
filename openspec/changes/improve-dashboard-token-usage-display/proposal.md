## Why
Dashboard account cards currently render token usage with a forced `k` suffix for all values. That creates confusing output for zero usage (for example `0k`/`Ok`) and hides more precise live-session values.

Separately, switching snapshots with `Use this account` can collapse mixed default-session telemetry onto only the active snapshot account, which makes other still-running accounts disappear from `Working now`.

## What Changes
- Keep account-card token source logic unchanged.
- Improve account-card token display formatting:
  - show `0` for zero or negative values
  - keep precise `k` display for live account cards (for example `98765` credits -> `98,765k`)
  - continue compact display for non-live account cards to preserve scanability
- Preserve matched live sessions for non-active snapshot accounts when local default-session telemetry is mixed across multiple snapshots.

## Impact
- Operators get clearer token usage at a glance.
- Zero usage is unambiguous.
- Live cards expose precise usage values without hiding active concurrent sessions.
