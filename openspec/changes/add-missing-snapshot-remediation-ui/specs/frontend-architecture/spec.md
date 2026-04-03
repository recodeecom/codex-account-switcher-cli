### ADDED Requirement: Missing snapshot remediation visibility in Accounts UI
The Accounts UI SHALL make missing `codex-auth` snapshots explicit and provide inline remediation steps.

#### Scenario: Account row has no resolved snapshot
- **WHEN** an account row has no resolved `codexAuth.snapshotName`
- **THEN** the row shows a red `No snapshot` warning badge.

#### Scenario: Account detail shows remediation tutorial
- **WHEN** the selected account has no resolved `codexAuth.snapshotName`
- **THEN** the detail panel shows a remediation tutorial with terminal commands:
  - `codex login`
  - `codex-auth save <snapshot-name>`
