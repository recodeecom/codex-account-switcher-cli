## Why

We already run a broad Rust parity bridge, but full Python shutdown still blocks on native ownership of key API families. We need one explicit cutover task ledger and we should start porting low-risk endpoints now.

## What Changes

- Add a Phase-6 OpenSpec change that tracks full-cutover route families and migration order:
  - `/api/dashboard/*`
  - `/api/accounts/*`
  - `/api/dashboard-auth/*`
  - `/api/medusa-admin-auth/*`
  - `/api/usage*` and `/api/request-logs*`
- Port `GET /api/dashboard/system-monitor` from Python proxy mode to Rust-native sampling.
- Keep dashboard auth fail-closed by validating session via Python auth session before serving Rust-native system monitor data.

## Impact

- Creates a durable execution task list for full Python -> Rust cutover.
- Reduces proxied surface by one endpoint immediately.
- Keeps migration safety by preserving auth/session gating and fail-closed behavior.
