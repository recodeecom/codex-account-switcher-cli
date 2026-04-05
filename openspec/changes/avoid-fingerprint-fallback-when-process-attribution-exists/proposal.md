## Why
When process-level snapshot attribution is available, mixed default-scope fingerprint fallback can still synthesize extra per-account live session hints. This can show the wrong account as "Working now" and attach session/task signals to accounts with zero mapped sessions.

## What Changes
- Disable mixed default-scope fingerprint fallback whenever process-level session attribution is present.
- Disable deferred default-scope sample hinting in the same condition.
- Update regression coverage to assert no inferred session attribution is produced for non-mapped accounts when process visibility exists.

## Impact
- UI session attribution follows mapped process ownership first.
- Prevents ghost "Working now" cards and misattributed task previews in mixed-session scenarios.
