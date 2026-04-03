### ADDED Requirement: Dashboard account card can launch an in-app Codex terminal
The Dashboard account cards SHALL provide a terminal action that opens an in-app terminal bound to the selected account snapshot.

#### Scenario: Terminal action opens for an account card
- **WHEN** an operator clicks `Terminal` on an account card with eligible status/quota
- **THEN** the UI opens a terminal dialog
- **AND** it connects to `/api/accounts/{accountId}/terminal/ws`.

#### Scenario: Terminal session switches account and starts Codex
- **WHEN** the backend accepts a terminal websocket for an account
- **THEN** it resolves and switches to the account's codex-auth snapshot
- **AND** it launches a PTY session that starts Codex for that account
- **AND** it streams terminal output back to the dialog.

#### Scenario: Missing snapshot returns terminal error event
- **WHEN** a terminal websocket is requested for an account without a codex-auth snapshot
- **THEN** the backend sends a terminal `error` event with code `codex_auth_snapshot_not_found`
- **AND** closes the websocket session.
