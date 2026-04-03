## ADDED Requirements

### Requirement: codex-auth login can auto-save refreshed sessions

The tooling SHALL provide a command `codex-auth login <name>` that runs `codex login` and, on successful login, saves the resulting auth session as `<name>`.

#### Scenario: Successful login and save

- **WHEN** an operator runs `codex-auth login work`
- **AND** `codex login` exits successfully
- **THEN** the command saves the active auth session as snapshot `work`
- **AND** prints a success message indicating the snapshot name

#### Scenario: Device auth passthrough

- **WHEN** an operator runs `codex-auth login work --device-auth`
- **THEN** the command runs `codex login --device-auth`
- **AND** on successful login saves snapshot `work`

#### Scenario: Failed login does not save snapshot

- **WHEN** `codex-auth login work` is executed
- **AND** `codex login` exits with a non-zero status
- **THEN** the command exits with an error
- **AND** does not overwrite or create a saved snapshot for `work`
