## ADDED Requirements

### Requirement: Account codex-auth expected snapshot name uses normalized email
Account payloads exposed to frontend surfaces SHALL use normalized email-shaped snapshot names as the expected canonical snapshot name.

#### Scenario: Expected snapshot name for account details
- **WHEN** an account summary is built with email `Viktor+Biz@EdiXAI.com`
- **THEN** `codexAuth.expectedSnapshotName` is `viktor+biz@edixai.com`.

### Requirement: Auto-import converges legacy snapshot aliases to canonical email name
Snapshot auto-import SHALL converge account snapshot selection toward the canonical email-shaped snapshot name when legacy aliases exist.

#### Scenario: Legacy alias exists for same account
- **WHEN** snapshot auto-import sees legacy alias `work.json` for email `user@example.com`
- **THEN** selection resolves to `user@example.com`
- **AND** subsequent materialization writes/refreshes `user@example.com.json`.
