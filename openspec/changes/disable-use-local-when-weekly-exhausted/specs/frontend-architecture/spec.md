### CHANGED Requirement: Dashboard page
The Dashboard account card `Use this account` action SHALL remain disabled when weekly quota is exhausted, even if 5h quota still has headroom.

#### Scenario: Weekly quota exhausted blocks local switch
- **WHEN** an account has `secondaryRemainingPercent < 1`
- **AND** the account is not already in a working-now session override path
- **THEN** `Use this account` is disabled
- **AND** the disabled reason indicates weekly quota depletion.
