## MODIFIED Requirements

### Requirement: Dashboard page
The Dashboard page SHALL display: summary metric cards (requests 7d, tokens, cost, error rate), primary and secondary usage donut charts with legends, account status cards grid, and a recent requests table with filtering and pagination.

#### Scenario: Default-scope unlabeled process can still map to active snapshot
- **WHEN** a running Codex process has no explicit snapshot/runtime metadata
- **AND** the process uses the default auth scope
- **AND** the process start timestamp is at or after the latest default snapshot selection timestamp (within configured tolerance)
- **THEN** the process contributes to live-session count for the active default snapshot
- **AND** that account can render `Working now`.

#### Scenario: Unlabeled stale or foreign process is ignored
- **WHEN** a running Codex process has no explicit snapshot/runtime metadata
- **AND** either it predates the latest default snapshot selection timestamp outside tolerance, or the process is not owned by the current user
- **THEN** the process MUST NOT be attributed to any account live-session count.
