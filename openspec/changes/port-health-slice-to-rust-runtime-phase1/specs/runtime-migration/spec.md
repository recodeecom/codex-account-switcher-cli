## ADDED Requirements

### Requirement: Rust health slice phase-1 parity surface
The Rust runtime SHALL expose phase-1 health endpoints that mirror Python health-contract semantics for startup and readiness checks.

#### Scenario: Rust live health contract includes nullable health-check fields
- **WHEN** `GET /health/live` is called on the Rust runtime
- **THEN** the response returns HTTP 200
- **AND** the JSON payload includes `status: "ok"`
- **AND** the payload includes nullable `checks` and `bridge_ring` fields.

#### Scenario: Rust readiness health reports infrastructure check
- **WHEN** `GET /health/ready` is called and `RUST_RUNTIME_DRAINING` is not enabled
- **THEN** the response returns HTTP 200
- **AND** the JSON payload includes `status: "ok"`
- **AND** `checks.database` equals `"ok"`.

#### Scenario: Rust readiness fails closed during draining
- **WHEN** `GET /health/ready` is called and `RUST_RUNTIME_DRAINING` is enabled
- **THEN** the response returns HTTP 503
- **AND** the JSON payload includes `detail: "Service is draining"`.

#### Scenario: Rust startup can fail closed while pending
- **WHEN** `GET /health/startup` is called and `RUST_RUNTIME_STARTUP_PENDING` is enabled
- **THEN** the response returns HTTP 503
- **AND** the JSON payload includes `detail: "Service is starting"`.

### Requirement: Rust/Python contract harness supports strict parity mode
The runtime comparison tool SHALL evaluate contract parity beyond raw body hashes and provide a strict mode for automation gates.

#### Scenario: Comparison output includes explicit contract fields
- **WHEN** `scripts/rust_runtime/compare_runtime.py` is run
- **THEN** each endpoint report includes status, content-type, canonical JSON body parity, and mismatch reasons.

#### Scenario: Strict mode exits non-zero on parity drift
- **WHEN** `scripts/rust_runtime/compare_runtime.py --strict` is run and any endpoint has contract mismatch
- **THEN** the script exits with status code 1.
