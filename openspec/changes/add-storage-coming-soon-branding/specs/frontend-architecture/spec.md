## MODIFIED Requirements
### Requirement: SPA routing
The application SHALL use React Router v6 for client-side routing with routes: `/dashboard`, `/accounts`, `/apis`, `/devices`, `/storage`, `/sessions`, and `/settings`. The root path `/` SHALL redirect to `/dashboard`. FastAPI SHALL serve `index.html` for all unmatched routes as a SPA fallback.

#### Scenario: Direct navigation to Storage route
- **WHEN** a user navigates directly to `/storage` in the browser
- **THEN** FastAPI serves `index.html` and React Router renders the Storage page

#### Scenario: Client-side navigation to Storage route
- **WHEN** a user clicks the `Storage (coming soon)` tab from another page
- **THEN** the URL changes to `/storage` without full page reload and the Storage page renders

### Requirement: Header branding and navigation
The application header SHALL present Codexina as a codex account manager and switcher and SHALL include a top-level `Storage (coming soon)` navigation item in both desktop and mobile navigation lists.

#### Scenario: Header shows Codexina positioning copy
- **WHEN** an authenticated user views the application header
- **THEN** the header shows `Codexina` and supporting product-positioning copy for account management and switching

#### Scenario: Storage nav item appears in all header variants
- **WHEN** the header renders on desktop and mobile
- **THEN** each navigation variant includes `Storage (coming soon)`

### Requirement: Storage page placeholder
The Storage page SHALL be a placeholder-only UI that communicates secure storage features are upcoming and SHALL not perform storage persistence actions yet.

#### Scenario: Storage page communicates coming-soon scope
- **WHEN** a user opens `/storage`
- **THEN** the page displays a Storage heading and coming-soon text for secure device storage and API environment value storage
- **AND** no create/update/delete storage action is available on the page
