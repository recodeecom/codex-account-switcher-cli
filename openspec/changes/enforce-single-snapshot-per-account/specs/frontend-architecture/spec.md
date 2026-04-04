## ADDED Requirements

### Requirement: Account-to-snapshot mapping is single-valued
Account snapshot resolution SHALL return at most one effective codex-auth snapshot name for any account.

#### Scenario: Multiple candidate snapshots collapse to one effective mapping
- **WHEN** an account has multiple candidate snapshots due to alias/mismatch names
- **THEN** resolution keeps exactly one snapshot name using the existing selection precedence
- **AND** downstream account flows consume only that single resolved snapshot.

#### Scenario: No candidate snapshot remains unresolved
- **WHEN** no snapshot candidate can be resolved for an account
- **THEN** snapshot resolution returns an empty list
- **AND** account flows treat the account as having no snapshot.
