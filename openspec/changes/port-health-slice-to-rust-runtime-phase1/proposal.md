## Why

Phase-0 proved the Rust scaffold and basic `/health` parity. To keep the Python-to-Rust migration moving safely, we need a concrete phase-1 slice that ports more of the Python health contract and strengthens parity evidence.

## What Changes

- Extend the Rust runtime health surface with `/health/ready` and `/health/startup` while preserving existing `/health` and `/health/live` behavior.
- Add fail-closed runtime flags for startup/draining states (`RUST_RUNTIME_STARTUP_PENDING`, `RUST_RUNTIME_DRAINING`) so readiness/startup semantics can be exercised without production cutover.
- Upgrade `scripts/rust_runtime/compare_runtime.py` from hash-only checks to contract parity checks (status, content-type, canonical JSON body) with optional strict exit behavior.

## Impact

- Provides a real migration slice from Python health semantics into the Rust layer.
- Increases confidence in parity before larger API slices are migrated.
- Keeps rollout reversible because traffic routing is still unchanged.
