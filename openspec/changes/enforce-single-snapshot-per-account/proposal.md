## Why

A single account can currently resolve to multiple codex-auth snapshots (for example canonical + mismatch aliases).
This leaks into dashboard/debug telemetry and makes account-level quota attribution noisy and confusing.

Operators need a deterministic one-snapshot policy so each account uses exactly one effective snapshot name.

## What Changes

- Enforce a one-snapshot-per-account policy in codex-auth snapshot resolution.
- Collapse multi-snapshot candidates to one deterministic snapshot using existing selection precedence.
- Keep downstream account status, local-switch, and live-usage flows compatible with the resolved single snapshot.

## Impact

- Dashboard/debug `snapshots=` output becomes stable and single-valued per account.
- Local switch and account mapping stop considering multiple aliases simultaneously.
- No API schema changes (behavioral rule only).
