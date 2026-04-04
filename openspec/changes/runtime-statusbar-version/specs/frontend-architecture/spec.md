## MODIFIED Requirements

### Requirement: Dashboard page
The Dashboard page SHALL display: summary metric cards (requests 7d, tokens, cost, error rate), primary and secondary usage donut charts with legends, account status cards grid, and a recent requests table with filtering and pagination.

#### Scenario: Footer version badge prefers runtime-resolved version
- **WHEN** the footer status bar renders the application version
- **THEN** it SHALL first try runtime version sources (`/package.json` in development and `/version.json` in built assets)
- **AND** it SHALL only fall back to compile-time version when runtime sources are unavailable.

#### Scenario: Built frontend exposes version payload
- **WHEN** the frontend build runs
- **THEN** the build output SHALL include a `version.json` asset containing the frontend package version.
