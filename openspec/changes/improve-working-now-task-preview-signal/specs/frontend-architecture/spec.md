## MODIFIED Requirements

### Requirement: Dashboard page
The Dashboard page SHALL display: summary metric cards (requests 7d, tokens, cost, error rate), primary and secondary usage donut charts with legends, account status cards grid, and a recent requests table with filtering and pagination.

#### Scenario: Deferred mixed-session accounts enter working-now with task-preview evidence
- **WHEN** account payload has `liveQuotaDebug.overrideReason` starting with `deferred_active_snapshot_mixed_default_sessions`
- **AND** `codexLiveSessionCount = 0`
- **AND** `codexTrackedSessionCount = 0`
- **AND** `codexSessionCount = 0`
- **AND** `codexAuth.hasLiveSession = false`
- **AND** `codexCurrentTaskPreview` is present and non-empty
- **THEN** the account SHALL be considered an active CLI session signal and MAY be grouped under `Working now`.

#### Scenario: Deferred mixed-session raw samples still do not mark working-now by themselves
- **WHEN** account payload has `liveQuotaDebug.overrideReason` starting with `deferred_active_snapshot_mixed_default_sessions`
- **AND** `codexLiveSessionCount = 0`
- **AND** `codexTrackedSessionCount = 0`
- **AND** `codexSessionCount = 0`
- **AND** `codexAuth.hasLiveSession = false`
- **AND** `codexCurrentTaskPreview` is missing or empty
- **THEN** raw debug sample presence alone SHALL NOT mark the account as `Working now`.
