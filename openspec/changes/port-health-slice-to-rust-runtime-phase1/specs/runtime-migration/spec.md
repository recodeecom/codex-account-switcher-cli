## ADDED Requirements

### Requirement: Rust layer exposes Python bridge health rollup
The Rust runtime SHALL expose a Python-layer rollup endpoint for migration-time operability.

#### Scenario: Bridge health is healthy when all Python probes succeed
- **WHEN** `GET /_python_layer/health` is called
- **AND** Python `/health`, `/health/live`, `/health/ready`, and `/health/startup` all return success statuses
- **THEN** the Rust endpoint returns HTTP 200
- **AND** the JSON payload includes `status: "ok"`
- **AND** each probed endpoint is listed with `ok: true`.

#### Scenario: Bridge health fails closed when any Python probe fails
- **WHEN** `GET /_python_layer/health` is called
- **AND** at least one probed Python endpoint returns non-success or request error
- **THEN** the Rust endpoint returns HTTP 503
- **AND** the JSON payload includes `status: "degraded"`
- **AND** the failing endpoint entry includes `ok: false` and a diagnostic detail string.

### Requirement: Python bridge probe configuration is runtime-controlled
The Rust runtime SHALL support environment-based configuration for Python bridge probing.

#### Scenario: Custom base URL is honored
- **WHEN** `PYTHON_RUNTIME_BASE_URL` is set
- **THEN** `/_python_layer/health` probes Python endpoints using that base URL.

#### Scenario: Probe timeout is configurable
- **WHEN** `RUST_RUNTIME_PYTHON_TIMEOUT_MS` is set to a positive integer
- **THEN** Rust uses that value as the per-request Python probe timeout.
