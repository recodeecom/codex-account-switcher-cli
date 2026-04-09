## 1. Specification

- [x] 1.1 Add OpenSpec change `port-proxy-websocket-transcribe-to-rust-phase6b` for Phase-6b hot-path parity gates.
- [x] 1.2 Define websocket + transcribe parity and fail-closed expectations in `runtime-migration` spec.

## 2. Implementation

- [ ] 2.1 Harden websocket bridge behavior for `/backend-api/codex/responses` and `/v1/responses` (upgrade, frame relay, close semantics).
- [ ] 2.2 Preserve transcribe multipart passthrough behavior for `/backend-api/transcribe` and `/v1/audio/transcriptions`.
- [ ] 2.3 Expand replay fixtures for websocket/transcribe-adjacent request contracts.
- [ ] 2.4 Ensure Rust fallback remains explicit fail-closed `503` JSON when upstream is unavailable.

## 3. Verification

- [ ] 3.1 Run strict parity replay:
  - `python3 scripts/rust_runtime/compare_runtime.py --requests-fixture scripts/rust_runtime/fixtures/runtime_proxy_family_replay.json --strict`
- [ ] 3.2 Run Rust runtime gates:
  - `cargo check -p codex-lb-runtime`
  - `cargo test -p codex-lb-runtime`
  - `cargo clippy -p codex-lb-runtime -- -D warnings`
- [ ] 3.3 Capture canary evidence bundle (shadow -> 1% -> 10% -> 50%) with rollback drill proof `<5m`.
