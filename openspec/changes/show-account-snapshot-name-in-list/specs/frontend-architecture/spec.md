### ADDED Requirement: Accounts list snapshot visibility
The Accounts list SHALL show codex-auth snapshot mapping status inline for each row.

#### Scenario: Account row has mapped snapshot
- **WHEN** an account row has a resolved `codexAuth.snapshotName`
- **THEN** the subtitle includes `<Plan Label> · <snapshotName>`

#### Scenario: Account row has no mapped snapshot
- **WHEN** an account row has no resolved `codexAuth.snapshotName`
- **THEN** the subtitle includes `<Plan Label> · No snapshot`
