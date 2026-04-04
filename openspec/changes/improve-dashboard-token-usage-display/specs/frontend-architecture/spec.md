## ADDED Requirements

### Requirement: Dashboard account-card token usage text is readable and precise for live sessions
Dashboard account cards SHALL render `Tokens used` with a display that avoids ambiguous zero values, keeps live-session values precise, and preserves scanability for non-live cards.

#### Scenario: Zero usage shows plain zero
- **WHEN** a dashboard account card resolves `Tokens used` as `0`
- **THEN** the card displays `0`
- **AND** it does not append a `k` suffix

#### Scenario: Sub-1000 credits keep k display
- **WHEN** a dashboard account card resolves `Tokens used` to a positive value below `1000`
- **THEN** the card displays the value with a `k` suffix (for example `225k`)

#### Scenario: Live account cards keep precise k display
- **WHEN** a dashboard account card is in `Working now`
- **AND** `Tokens used` resolves to a positive value
- **THEN** the card displays the exact credit value with `k` suffix (for example `98765` -> `98,765k`)

#### Scenario: Non-live account cards keep compact display for high totals
- **WHEN** a dashboard account card is not in `Working now`
- **AND** `Tokens used` resolves to `1000` or greater
- **THEN** the card displays a compact token-unit value (for example `1500` credits -> `1.5m`)

### Requirement: Mixed default-session telemetry preserves concurrent working accounts
Dashboard and Accounts responses SHALL preserve matched live-session presence/count for non-active snapshot accounts when local default-session telemetry contains mixed active snapshots.

#### Scenario: Active snapshot switch does not drop another matched working account
- **WHEN** local default-session telemetry has active session samples that fingerprint-match multiple accounts
- **AND** one account is the active snapshot
- **THEN** the active snapshot account remains `hasLiveSession = true`
- **AND** matched non-active accounts also remain `hasLiveSession = true` with their matched `codexSessionCount`
