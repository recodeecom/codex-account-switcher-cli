## MODIFIED Requirements

### Requirement: Dashboard page

The Dashboard page SHALL display: summary metric cards (requests 7d, tokens, cost, error rate), primary and secondary usage donut charts with legends, account status cards grid, and a recent requests table with filtering and pagination.

#### Scenario: Usage-limit grace does not restart from rotated telemetry sources
- **WHEN** an account is usage-limit-hit (`0%` rounded 5h remaining)
- **AND** its telemetry poll rotates rollout source identifiers while snapshot/counters/task identity remains the same
- **THEN** the 60-second grace timer SHALL continue from the original hit and SHALL NOT restart.

#### Scenario: Expired usage-limit grace hides stale current task preview
- **WHEN** an account card is usage-limit-hit and its 60-second grace has expired
- **THEN** the card SHALL show `No active task reported` instead of stale prior task text.
