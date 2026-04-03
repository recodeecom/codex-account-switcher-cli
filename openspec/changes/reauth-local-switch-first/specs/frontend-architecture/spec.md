### ADDED Requirement: Re-auth actions attempt local snapshot switch before OAuth fallback
Re-auth actions for deactivated accounts SHALL first attempt the same local snapshot switch flow used by `Use this account`.
If local snapshot switching fails, the UI SHALL fall back to the existing re-auth surface.

#### Scenario: Dashboard re-auth succeeds with local snapshot switch
- **WHEN** an account card is `deactivated`
- **AND** the user clicks `Re-auth`
- **THEN** the app calls `POST /api/accounts/{accountId}/use-local` before opening OAuth UI
- **AND** on success, the dashboard remains on `/dashboard`

#### Scenario: Dashboard re-auth falls back when local switch fails
- **WHEN** an account card is `deactivated`
- **AND** the user clicks `Re-auth`
- **AND** `POST /api/accounts/{accountId}/use-local` returns an error
- **THEN** the app navigates to `/accounts?selected={accountId}`

#### Scenario: Accounts re-authenticate falls back to OAuth dialog
- **WHEN** the selected account in `/accounts` is `deactivated`
- **AND** the user clicks `Re-authenticate`
- **THEN** the app calls `POST /api/accounts/{accountId}/use-local` first
- **AND** when that call fails, the OAuth dialog opens for manual re-authentication
