## MODIFIED Requirements

### Requirement: Dashboard page
The Dashboard page SHALL display: summary metric cards (requests 7d, tokens, cost, error rate), primary and secondary usage donut charts with legends, account status cards grid, and a recent requests table with filtering and pagination.

#### Scenario: Active CLI sessions stay in working-now despite depleted 5h
- **WHEN** an account has an active CLI session signal (`codexLiveSessionCount > 0`, `codexTrackedSessionCount > 0`, or compatibility `codexSessionCount > 0`)
- **AND** the primary 5h remaining percentage is `0` (or rounds to `0%`)
- **THEN** the account SHALL remain in the dashboard `Working now` section.

#### Scenario: Depleted 5h without active session stays out of working-now
- **WHEN** an account has no active CLI session signal
- **AND** the primary 5h remaining percentage is `0` (or rounds to `0%`)
- **THEN** the account SHALL NOT be grouped under `Working now`.

#### Scenario: Snapshot live-session signal is preserved when scoped fallback samples are missing
- **WHEN** an account reports `codexAuth.hasLiveSession = true`
- **AND** `liveQuotaDebug.overrideReason = "no_live_telemetry"`
- **AND** no account-scoped raw sample is available for the snapshot
- **THEN** the account SHALL remain eligible for `Working now` grouping.
