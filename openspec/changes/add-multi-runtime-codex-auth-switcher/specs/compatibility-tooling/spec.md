## ADDED Requirements

### Requirement: Runtime-scoped codex auth switching CLI

The system SHALL provide a CLI that supports runtime-scoped Codex auth switching so multiple local terminals can use different accounts concurrently.

#### Scenario: Runtime-scoped switch updates only runtime auth pointers

- **WHEN** an operator switches runtime `terminal-a` to snapshot `work`
- **THEN** runtime-specific `CODEX_AUTH_CURRENT_PATH` and `CODEX_AUTH_JSON_PATH` are updated under a runtime directory
- **AND** the default/global codex profile paths are not required for that switch operation

#### Scenario: Runtime-scoped command execution uses isolated auth env

- **WHEN** an operator runs a command through the runtime CLI (`run`)
- **THEN** the child process receives runtime-specific `CODEX_AUTH_*` environment variables
- **AND** command exit code is propagated to the caller

#### Scenario: Runtime switch can optionally sync selected snapshot to codex-lb

- **WHEN** runtime switch is invoked with dashboard sync enabled
- **THEN** the selected snapshot file is imported through existing dashboard auth/import flow
- **AND** switch still succeeds locally when dashboard sync is disabled
