## MODIFIED Requirements

### Requirement: Sticky sessions are explicitly typed
The system SHALL persist each sticky-session mapping with an explicit kind so durable Codex backend affinity, durable dashboard sticky-thread routing, and bounded prompt-cache affinity can be managed independently.

#### Scenario: New prompt-cache mapping avoids low-budget accounts
- **WHEN** a new `prompt_cache` mapping is selected and one or more candidate accounts are above the configured budget threshold
- **THEN** account selection excludes those above-threshold candidates
- **AND** if every candidate is above threshold, selection falls back to the full pool

#### Scenario: Existing prompt-cache mapping remains pinned above threshold
- **WHEN** a `prompt_cache` mapping already exists for a key
- **AND** the pinned account rises above the configured budget threshold
- **THEN** the mapping remains pinned to that account
- **AND** threshold filtering applies only to creation of new mappings
