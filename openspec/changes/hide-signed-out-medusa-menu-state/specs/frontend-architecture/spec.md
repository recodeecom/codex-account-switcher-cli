### CHANGED Requirement: Accounts page
The global account dropdown SHALL hide Medusa admin menu state when there is no Medusa admin session information to show.

#### Scenario: Signed-out Medusa state is omitted from the menu
- **WHEN** an authenticated dashboard user opens the account menu without an active Medusa admin session
- **THEN** the menu does not render `Sign in Medusa admin`
- **AND** the menu does not render the signed-out `Medusa admin` footer row.

#### Scenario: Signed-in Medusa state stays visible
- **WHEN** a Medusa admin is currently signed in through the account menu
- **THEN** the menu still renders `Sign out Medusa admin`
- **AND** the footer shows the authenticated Medusa admin email.

#### Scenario: Last Medusa login only appears when recorded
- **WHEN** there is no recorded Medusa admin login email
- **THEN** the menu does not render the `Last Medusa admin login` footer row.
