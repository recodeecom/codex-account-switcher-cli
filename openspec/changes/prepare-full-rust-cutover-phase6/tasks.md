## 1. Specification

- [x] 1.1 Add OpenSpec change `prepare-full-rust-cutover-phase6` covering cutover task ledger + first native endpoint.
- [x] 1.2 Define acceptance scenarios for native system-monitor response shape and auth fail-closed behavior.

## 2. Implementation

- [x] 2.1 Create a full-cutover task ledger in this change for the remaining route families.
- [x] 2.2 Port `GET /api/dashboard/system-monitor` to Rust-native sampling (CPU/memory/network + spike).
- [x] 2.3 Preserve auth fail-closed behavior by requiring successful dashboard session validation before serving native sample.
- [x] 2.4 Add/adjust Rust runtime tests for native system-monitor shape and auth/upstream failure handling.

## 3. Verification

- [ ] 3.1 Run `cargo fmt --all` in `rust/codex-lb-runtime`.
- [ ] 3.2 Run `cargo test` in `rust/codex-lb-runtime`.
- [ ] 3.3 Run `cargo clippy -- -D warnings` in `rust/codex-lb-runtime`.
- [ ] 3.4 Run `openspec validate prepare-full-rust-cutover-phase6 --type change --strict`.
