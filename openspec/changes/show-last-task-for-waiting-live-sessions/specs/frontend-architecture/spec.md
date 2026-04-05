## MODIFIED Requirements
### Requirement: Dashboard page
The Dashboard page SHALL display: summary metric cards (requests 7d, tokens, cost, error rate), primary and secondary usage donut charts with legends, account status cards grid, and a recent requests table with filtering and pagination.

#### Scenario: Account card keeps waiting state and shows last known task context
- **WHEN** `GET /api/dashboard/overview` returns `accounts[].codexCurrentTaskPreview = "Waiting for new task"`
- **AND** the same account includes `accounts[].codexLastTaskPreview`
- **THEN** the card SHALL keep `Waiting for new task` as the primary current-task label
- **AND** the card SHALL render the last-known task as secondary context
- **AND** the secondary context SHALL not affect working-now detection by itself

### Requirement: Sessions page
The Sessions page SHALL display read-only Codex sessions grouped by account using sticky-session data filtered to `codex_session` kind.

#### Scenario: Fallback session rows show waiting state with last task context
- **WHEN** sticky codex-session mappings are empty and `/sessions` falls back to dashboard overview telemetry
- **AND** an overview row includes `codexCurrentTaskPreview = "Waiting for new task"` plus `codexLastTaskPreview`
- **THEN** the row SHALL keep the waiting label in the Current task column
- **AND** the row SHALL show the last-known task as secondary muted context for that account row
