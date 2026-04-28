# snapshot-sync Spec Delta

## ADDED Requirements

### Requirement: Fast direct account switch

`codex-auth use <account>` SHALL switch `~/.codex/auth.json` to the selected saved snapshot without running the external-login sync preflight.

#### Scenario: Switching a saved account

- **WHEN** the user runs `codex-auth use team-primary`
- **THEN** the command copies `accounts/team-primary.json` into `auth.json`
- **AND** updates the active account pointers for the current terminal session
- **AND** does not run the external-login sync preflight before the copy

### Requirement: Relogin refreshes matching saved snapshot

External Codex login sync SHALL refresh the saved snapshot that matches the newly written `auth.json` by identity or email, preferring the active session snapshot and preserving alias names.

#### Scenario: Same account relogin refreshes tokens

- **GIVEN** `team-primary` is the active saved snapshot
- **AND** `auth.json` is rewritten by `codex login` for the same Codex identity with new tokens
- **WHEN** external sync runs
- **THEN** `accounts/team-primary.json` is overwritten with the new auth bytes
- **AND** the active account remains `team-primary`

#### Scenario: New account relogin is added

- **GIVEN** no saved snapshot matches the newly written `auth.json`
- **WHEN** external sync runs
- **THEN** a new snapshot name is inferred from the Codex auth email
- **AND** that snapshot becomes the active account
