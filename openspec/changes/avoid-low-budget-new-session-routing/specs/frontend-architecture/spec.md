## MODIFIED Requirements

### Requirement: Settings page
The Settings page SHALL include sections for: routing settings (sticky threads, reset priority, prompt-cache affinity TTL, low-budget switch threshold), password management (setup/change/remove), TOTP management (setup/disable), API key auth toggle, API key management (table, create, edit, delete, regenerate), and sticky-session administration.

#### Scenario: Save low-budget switch threshold
- **WHEN** a user updates the low-budget switch threshold from the routing settings section
- **THEN** the app calls `PUT /api/settings` with `stickyReallocationBudgetThresholdPct`
- **AND** subsequent reads from `GET /api/settings` render the saved value in Routing settings
