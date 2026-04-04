## ADDED Requirements

### Requirement: Mixed default-session attribution is deterministic for concurrent accounts
When local default-session samples represent concurrent activity from multiple accounts, attribution SHALL run as a deterministic global assignment across candidate accounts and active samples.

#### Scenario: Stable global assignment for concurrent 3–8 account activity
- **WHEN** 3 to 8 accounts have concurrent active default-session samples
- **AND** per-sample percent gaps are close for multiple accounts
- **THEN** account attribution remains deterministic across repeated runs and input-order variations
- **AND** `codexSessionCount` reflects the assigned concurrent sessions per account

### Requirement: Unique reset fingerprints anchor quota overrides
Unique reset-fingerprint matches SHALL be treated as hard attribution anchors for usage-window overrides.

#### Scenario: Unique reset attribution updates quota windows
- **WHEN** a sample has a unique reset-fingerprint match to one account
- **THEN** that account receives quota-window overrides from the sample
- **AND** account live/session signals are updated

### Requirement: Ambiguous mixed attribution favors recall for live/session signals
Ambiguous samples that cannot be safely attributed for quota windows SHALL still contribute to conservative live/session detection.

#### Scenario: Ambiguous attribution updates live/session only
- **WHEN** concurrent samples cannot be uniquely attributed by reset fingerprints
- **THEN** `codexAuth.hasLiveSession` and `codexSessionCount` are updated using best-effort deterministic assignment and recall-biased fallback
- **AND** `usage.primaryRemainingPercent` and `usage.secondaryRemainingPercent` remain on baseline persisted values for ambiguous assignments
