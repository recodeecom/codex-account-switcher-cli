## MODIFIED Requirements

### Requirement: Dashboard page
The Dashboard page SHALL display: summary metric cards (requests 7d, tokens, cost, error rate), primary and secondary usage donut charts with legends, account status cards grid, and a recent requests table with filtering and pagination.

#### Scenario: Working now uses live terminal telemetry only
- **WHEN** a dashboard account has live Codex terminal telemetry (`codexLiveSessionCount > 0`)
- **THEN** the account can render the `Working now` indicator
- **AND** tracked sticky-session residue alone (`codexTrackedSessionCount > 0` with `codexLiveSessionCount = 0`) MUST NOT mark the account as working now

#### Scenario: Card session headline is live, tracked is secondary
- **WHEN** a dashboard account card renders session telemetry
- **THEN** the primary `Codex CLI sessions` number is driven by `codexLiveSessionCount`
- **AND** tracked sticky-session inventory is shown separately from `codexTrackedSessionCount`

### Requirement: Dashboard page auto-refresh
Dashboard/account polling SHALL switch to fast refresh only while at least one account is actively working.

#### Scenario: Fast polling requires a live account
- **WHEN** no account has `codexLiveSessionCount > 0`
- **THEN** frontend polling remains on the default interval
- **AND** tracked-only residue MUST NOT trigger fast polling

### Requirement: Account summary session counters expose live and tracked signals
Account summaries returned to the frontend SHALL expose separate live and tracked codex session counters.

#### Scenario: API payload includes split counters with compatibility alias
- **WHEN** account summaries are serialized for accounts/dashboard responses
- **THEN** each account includes `codexLiveSessionCount` and `codexTrackedSessionCount`
- **AND** `codexSessionCount` remains present as a compatibility alias mapped to `codexLiveSessionCount`
