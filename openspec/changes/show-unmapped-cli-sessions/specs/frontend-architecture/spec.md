## MODIFIED Requirements

### Requirement: Sessions page
The Sessions page SHALL display active codex-session routing metadata and fallback telemetry with account-level status/task context.

#### Scenario: Show unmapped CLI sessions when no account mapping exists
- **WHEN** the backend detects active Codex CLI session snapshots with no mapped account
- **THEN** `/api/sticky-sessions` SHALL return those snapshots in `unmappedCliSessions`
- **AND** the Sessions page SHALL render an `Unmapped CLI sessions` section listing snapshot/session counts.

#### Scenario: Empty state only when both mapped and unmapped sessions are absent
- **WHEN** sticky codex-session rows are empty
- **AND** fallback overview rows are empty
- **AND** `unmappedCliSessions` is empty
- **THEN** the Sessions page SHALL show the `No Codex sessions` empty state.
