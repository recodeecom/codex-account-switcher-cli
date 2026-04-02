### ADDED Requirement: Dashboard highlights active local codex-auth account
The Dashboard account cards SHALL show a `Working now` indicator when the account matches the active local codex-auth snapshot.

#### Scenario: Active snapshot indicator is visible on matching account card
- **WHEN** `GET /api/dashboard/overview` returns an account with `codexAuth.isActiveSnapshot = true`
- **THEN** that account card renders `Working now` next to the status badge
- **AND** account cards without `isActiveSnapshot = true` do not render the indicator

#### Scenario: Indicator updates immediately after switching local account
- **WHEN** the user clicks `Use this account` and the switch succeeds
- **THEN** the dashboard overview query refetches
- **AND** the `Working now` indicator moves to the newly selected account card
