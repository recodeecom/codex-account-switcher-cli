## Why
When an account is marked `deactivated`, the current `Re-auth` action jumps directly to the Accounts/OAuth flow. This skips a faster path that already exists in `Use this account`: trying to switch to the stored codex-auth snapshot first.

## What Changes
- Update Dashboard `Re-auth` action to try the same local snapshot switch used by `Use this account`.
- If that local switch fails, fall back to opening the account details/OAuth flow.
- Update Accounts page `Re-authenticate` action to try local snapshot switch first, then fall back to OAuth dialog.
- Add regression tests for success and fallback paths.

## Impact
- Faster recovery for deactivated accounts when saved snapshot credentials are still valid.
- Re-auth remains available as fallback when local switch cannot be completed.
