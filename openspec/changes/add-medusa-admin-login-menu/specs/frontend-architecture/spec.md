## MODIFIED Requirements

### Requirement: Global layout and shell components
The application SHALL include a global shell with header/sidebar composition, and the header account menu SHALL expose account-level actions, route shortcuts, and authentication controls.

#### Scenario: Sign in Medusa admin from account menu
- **WHEN** an authenticated dashboard user opens the account menu and selects `Sign in Medusa admin`
- **THEN** the app opens a credentials dialog requesting Medusa admin email and password
- **AND** on successful Medusa auth, the app stores the returned admin token in frontend runtime state
- **AND** the app verifies the token by fetching the currently logged-in Medusa user profile
- **AND** the account menu shows the logged-in Medusa admin email

#### Scenario: Sign out Medusa admin from account menu
- **WHEN** a Medusa admin is currently signed in and the user selects `Sign out Medusa admin`
- **THEN** the app clears Medusa admin token and user state from frontend runtime state
- **AND** the account menu shows Medusa admin status as not signed in
