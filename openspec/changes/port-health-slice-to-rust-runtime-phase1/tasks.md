## 1. Specification

- [x] 1.1 Add OpenSpec change `port-health-slice-to-rust-runtime-phase1` with phase-1 health-slice parity requirements.
- [x] 1.2 Define strict comparison-harness acceptance scenarios for contract mismatch detection.

## 2. Implementation

- [x] 2.1 Extend Rust runtime health surface with `/health/ready` and `/health/startup` plus fail-closed runtime flags.
- [x] 2.2 Align `/health/live` response shape with Python health contract (`checks` + `bridge_ring` nullable fields).
- [x] 2.3 Upgrade `scripts/rust_runtime/compare_runtime.py` to include content-type and canonical JSON parity with `--strict` exit behavior.
- [x] 2.4 Update phase migration usage notes in `scripts/rust_runtime/README.md`.

## 3. Verification

- [x] 3.1 Run `cargo test` for `rust/codex-lb-runtime`.
- [x] 3.2 Run `python scripts/rust_runtime/compare_runtime.py --help`.
- [x] 3.3 Run `openspec validate port-health-slice-to-rust-runtime-phase1 --type change --strict`.
- [x] 3.4 Run `openspec validate --specs`.
