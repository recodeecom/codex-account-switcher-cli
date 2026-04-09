## ADDED Requirements

### Requirement: Phase-6 full-cutover task ledger is explicit and executable
The migration plan SHALL keep an explicit task ledger for all remaining Python-owned API families required for full cutover.

#### Scenario: Cutover ledger includes all blocking API families
- **WHEN** engineers review the Phase-6 change tasks
- **THEN** the plan lists migration ownership work for:
  - `/api/dashboard/*`
  - `/api/accounts/*`
  - `/api/dashboard-auth/*`
  - `/api/medusa-admin-auth/*`
  - `/api/usage*` and `/api/request-logs*`.

### Requirement: Rust serves native dashboard system-monitor response
The Rust runtime SHALL serve `GET /api/dashboard/system-monitor` using native metric sampling while preserving dashboard-session safety.

#### Scenario: Native monitor sample is returned for authenticated session
- **WHEN** `GET /api/dashboard/system-monitor` is called with valid dashboard session context
- **THEN** Rust returns HTTP `200`
- **AND** the JSON payload includes `sampledAt`, `cpuPercent`, `memoryPercent`, `networkMbS`, and `spike` fields.

#### Scenario: Native monitor endpoint fails closed on missing/invalid session
- **WHEN** `GET /api/dashboard/system-monitor` is called without valid dashboard session context
- **THEN** Rust returns upstream auth failure status/details (for example HTTP `401`).

#### Scenario: Native monitor endpoint fails closed when session check upstream is unavailable
- **WHEN** the Python dashboard-session check endpoint is unavailable
- **AND** `GET /api/dashboard/system-monitor` is called
- **THEN** Rust returns HTTP `503`
- **AND** response payload includes explicit session-check failure detail.
