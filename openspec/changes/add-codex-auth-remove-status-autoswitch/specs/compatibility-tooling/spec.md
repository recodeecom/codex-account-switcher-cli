## ADDED Requirements

### Requirement: codex-auth remove supports interactive multi-select and selectors

The tooling SHALL provide `codex-auth remove` that supports interactive multi-select, fuzzy query selection, and full deletion with `--all`.

#### Scenario: Interactive multi-select remove

- **WHEN** an operator runs `codex-auth remove` in a TTY
- **THEN** the command presents a multi-select list of saved snapshots
- **AND** removes only the selected snapshots after confirmation input

#### Scenario: Query-based remove

- **WHEN** an operator runs `codex-auth remove team`
- **THEN** the command matches snapshots by name or email fragment
- **AND** removes the resolved snapshot(s)

#### Scenario: Remove all snapshots

- **WHEN** an operator runs `codex-auth remove --all`
- **THEN** all saved snapshots are removed
- **AND** active pointers are cleared or switched to a remaining best candidate if available

### Requirement: codex-auth status reports switch and service state

The tooling SHALL provide `codex-auth status` that reports auto-switch enablement, managed service runtime state, thresholds, and usage mode.

#### Scenario: Status output fields

- **WHEN** `codex-auth status` is executed
- **THEN** output includes `auto-switch`, `service`, `thresholds`, and `usage` lines

### Requirement: codex-auth supports managed low-credit auto-switching

The tooling SHALL support managed auto-switching via `config` and `daemon` commands and SHALL switch away from active accounts that cross configured thresholds.

#### Scenario: Enable auto-switch service

- **WHEN** an operator runs `codex-auth config auto enable`
- **THEN** managed background watcher installation is attempted for the current platform
- **AND** registry config marks auto-switch as enabled

#### Scenario: Threshold-based switch decision

- **WHEN** the active account falls below configured 5h or weekly threshold
- **AND** a better candidate snapshot is available
- **THEN** `codex-auth daemon --once` switches active auth to the better candidate

#### Scenario: Usage mode selection

- **WHEN** an operator runs `codex-auth config api disable`
- **THEN** usage mode is persisted as local mode
- **AND** status reports `usage: local`
