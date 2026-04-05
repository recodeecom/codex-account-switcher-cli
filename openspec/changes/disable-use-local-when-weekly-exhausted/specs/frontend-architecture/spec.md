### CHANGED Requirement: Dashboard page
The Dashboard account card `Use this account` action SHALL remain disabled when weekly quota is exhausted, even if 5h quota still has headroom.

#### Scenario: Weekly quota exhausted blocks local switch
- **WHEN** an account has `secondaryRemainingPercent < 1`
- **THEN** `Use this account` is disabled
- **AND** the disabled reason indicates weekly quota depletion.

#### Scenario: Weekly quota exhausted still blocks working-now accounts
- **WHEN** an account has `secondaryRemainingPercent < 1`
- **AND** the account has an active/working-now session signal
- **THEN** `Use this account` is disabled
- **AND** the disabled reason indicates weekly quota depletion.

#### Scenario: Weekly badge shown as 0% blocks local switch
- **WHEN** the dashboard card renders weekly remaining as `0%` due near-zero display normalization
- **THEN** `Use this account` is disabled
- **AND** the disabled reason indicates weekly quota is shown as exhausted.
