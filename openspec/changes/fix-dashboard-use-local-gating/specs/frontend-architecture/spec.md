### CHANGED Requirement: Dashboard page
The Dashboard account card `Use this account` action SHALL be enabled/disabled using the same normalized 5h quota value that is rendered in the card's 5h quota bar.

#### Scenario: Use-local gating matches rendered 5h quota
- **WHEN** an account card renders with a normalized 5h remaining value
- **THEN** `Use this account` uses that same normalized 5h value for eligibility checks
- **AND** the UI does not show a healthy 5h bar while disabling `Use this account` due to a different quota source.
