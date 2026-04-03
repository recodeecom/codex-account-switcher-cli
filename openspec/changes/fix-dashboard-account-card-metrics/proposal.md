## Why
Dashboard account cards can show misleading values:

- `Tokens used` currently comes from request logs aggregation, which can be zero even when quota bars clearly show usage.
- `Codex sessions` can display `0` for the currently active local snapshot, which reads as contradictory next to `Working now`.
- Active snapshot detection can prefer stale local pointers, so the wrong account gets the `Working now` badge.

## What Changes
- Prefer `accounts/registry.json.activeAccountName` when resolving active codex-auth snapshot for dashboard/account APIs, with fallback to `current` then `auth.json` symlink.
- Keep snapshot resolution fail-safe by validating candidate snapshot names against existing `accounts/*.json` files.
- Drive account-card `Tokens used` from quota consumption (`capacityCredits - remainingCredits`) using the account’s active window context:
  - regular accounts: primary (5h) window
  - weekly-only accounts: secondary (weekly) window
  - fallback: request-usage total tokens when window data is unavailable
- Render `Codex sessions` as at least `1` when `codexAuth.isActiveSnapshot = true` and the raw session count is `0`.

## Impact
- Dashboard card metrics match visible quota state.
- `Working now` badge aligns with the real active snapshot more reliably.
- Active account cards avoid contradictory `0` session display.
