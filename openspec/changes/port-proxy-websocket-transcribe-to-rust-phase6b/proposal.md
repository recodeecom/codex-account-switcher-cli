## Why

Phase-6 wildcard streaming parity is complete, but websocket and transcription hot paths still need explicit parity hardening evidence before broader Rust cutover confidence is justified.

## What Changes

- Harden websocket bridge semantics for:
  - `/backend-api/codex/responses`
  - `/v1/responses`
- Lock multipart passthrough behavior for:
  - `/backend-api/transcribe`
  - `/v1/audio/transcriptions`
- Expand strict replay fixtures for websocket/transcribe-adjacent request contracts.
- Capture strict parity, runtime-gate, canary, and rollback evidence artifacts.

## Impact

- `rust/codex-lb-runtime/src/runtime/responses_bridge.rs`
- `rust/codex-lb-runtime/src/main.rs`
- `scripts/rust_runtime/fixtures/runtime_proxy_family_replay.json`
- `openspec/changes/port-proxy-websocket-transcribe-to-rust-phase6b/evidence/*`
