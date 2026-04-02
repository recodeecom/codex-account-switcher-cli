## MODIFIED Requirements
### Requirement: SPA routing
The application SHALL use React Router v6 for client-side routing with routes: `/dashboard`, `/accounts`, `/apis`, `/devices`, and `/settings`. The root path `/` SHALL redirect to `/dashboard`. FastAPI SHALL serve `index.html` for all unmatched routes as a SPA fallback.

#### Scenario: Direct navigation to Devices route
- **WHEN** a user navigates directly to `/devices` in the browser
- **THEN** FastAPI serves `index.html` and React Router renders the Devices page

#### Scenario: Client-side navigation to Devices route
- **WHEN** a user clicks the `Devices` tab from another page
- **THEN** the URL changes to `/devices` without full page reload and the Devices page renders

### Requirement: Devices page
The Devices page SHALL display a list of saved devices and allow operators to add and remove devices. Each device SHALL store `name` and `ipAddress` values and persist across page reloads.

#### Scenario: Devices list loads
- **WHEN** a user opens `/devices`
- **THEN** the frontend calls `GET /api/devices` and renders the returned entries

#### Scenario: User adds a device
- **WHEN** a user submits a device name and valid IPv4 or IPv6 address
- **THEN** the frontend calls `POST /api/devices` and the new entry appears in the list

#### Scenario: User removes a device
- **WHEN** a user confirms deletion for an existing device
- **THEN** the frontend calls `DELETE /api/devices/{deviceId}` and refreshes the displayed list
