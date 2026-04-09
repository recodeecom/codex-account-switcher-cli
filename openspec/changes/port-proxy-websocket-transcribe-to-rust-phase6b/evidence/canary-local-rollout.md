# Phase-6b Local Canary Evidence

Generated: 2026-04-09T22:29:28Z

## Shadow parity
- Requests: 6
- Mismatches: 0 (status+content-type transport parity)
- Match rate: 1.0

## Canary phases
- canary_1pct: rust=1/120, mismatches=0 (status+content-type transport parity), error_rate=0.0, rust_p95_ms=2.65, python_p95_ms=45.77
- canary_10pct: rust=12/120, mismatches=0 (status+content-type transport parity), error_rate=0.0, rust_p95_ms=43.33, python_p95_ms=43.34
- canary_50pct: rust=60/120, mismatches=0 (status+content-type transport parity), error_rate=0.0, rust_p95_ms=48.89, python_p95_ms=45.86

## Rollback drill
- Target: <5m
- Measured: 0.001s
- Within target: True
- Notes: Local direct-python rollback check; production traffic-switch drill still required before full promotion.
