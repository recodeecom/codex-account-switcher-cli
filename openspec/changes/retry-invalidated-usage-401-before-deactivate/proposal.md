## Why

`UsageUpdater` currently deactivates an account immediately when the first usage poll returns
`401` with an "authentication token has been invalidated" style message.

In practice, that first `401` can be recovered by a forced refresh + retry path. Immediate
deactivation makes accounts flap to deactivated state too aggressively during dashboard polling,
which creates noisy logs and unnecessary manual re-auth flows.

## What Changes

- Update usage refresh error handling so `401` + invalidated-token markers go through one
  forced `ensure_fresh(..., force=True)` attempt when auth refresh is available.
- Keep invalidated-token `401` deactivation on the repeated-client-error streak path
  (same threshold as other client errors) instead of forcing immediate deactivation.
- Deactivate immediately only when refresh itself fails permanently.
- Keep the existing fallback behavior when auth refresh is unavailable.

## Impact

- Reduces false-positive account deactivations from recoverable first-pass invalidated-token `401`s.
- Preserves deactivation for truly disconnected accounts while avoiding one-shot invalidated-token flaps.
- Keeps sibling invalidated-token cooldown behavior intact.
