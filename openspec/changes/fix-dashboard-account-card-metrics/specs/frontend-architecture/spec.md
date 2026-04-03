## ADDED Requirements

### Requirement: Dashboard account cards display quota-consistent usage and active-session state
Dashboard account cards SHALL derive `Tokens used` from per-account quota consumption in dashboard overview windows and SHALL avoid showing zero codex sessions for the active local snapshot.

#### Scenario: Regular account token usage uses primary window consumption
- **WHEN** dashboard overview contains a regular account with a primary-window row
- **THEN** card `Tokens used` displays `max(0, capacityCredits - remainingCredits)` from that primary row
- **AND** it does not require request-log aggregates to be non-zero

#### Scenario: Weekly-only account token usage uses secondary window consumption
- **WHEN** dashboard overview marks an account as weekly-only (`windowMinutesPrimary = null`, `windowMinutesSecondary != null`)
- **THEN** card `Tokens used` displays `max(0, capacityCredits - remainingCredits)` from the secondary row

#### Scenario: Active snapshot card shows at least one codex session
- **WHEN** an account card has `codexAuth.isActiveSnapshot = true`
- **AND** `codexSessionCount = 0`
- **THEN** card `Codex sessions` displays `1`

### Requirement: Dashboard active snapshot detection prioritizes registry active account
Dashboard/account APIs SHALL resolve active codex-auth snapshot name using validated source precedence so UI active indicators reflect current local runtime state.

#### Scenario: Registry active account overrides stale local pointer
- **WHEN** `accounts/registry.json.activeAccountName` points to an existing snapshot
- **AND** `current` or `auth.json` points to a different snapshot
- **THEN** the active snapshot used for `codexAuth.isActiveSnapshot` is the registry snapshot

#### Scenario: Invalid registry active account falls back safely
- **WHEN** `accounts/registry.json.activeAccountName` is missing, invalid, or does not map to an existing snapshot file
- **THEN** active snapshot resolution falls back to `current` then `auth.json` symlink target
