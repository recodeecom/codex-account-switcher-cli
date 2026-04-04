## Why

The Sessions page can show "No Codex sessions" even when local Codex CLI processes are active but not mapped to any known account snapshot. Operators need visibility into these orphaned sessions to understand why account grouping is missing.

## What Changes

- Extend `/api/sticky-sessions` to return an `unmappedCliSessions` list with active snapshot-level CLI session counts that do not map to any account.
- Keep normal sticky-session rows unchanged.
- Update the Sessions page to render an "Unmapped CLI sessions" section, including snapshot and session counts, even when mapped session rows are empty.

## Impact

- Users can immediately see CLI activity that is currently unmapped instead of a blank sessions screen.
- Debugging account/snapshot mapping issues becomes faster without leaving the dashboard.
