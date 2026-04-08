## MODIFIED Requirements

### Requirement: SPA routing
The application SHALL use React Router v6 for client-side routing with routes: `/dashboard`, `/accounts`, `/billing`, `/apis`, `/devices`, `/storage`, `/sessions`, `/settings`, and `/firewall` (redirect to `/settings`). The root path `/` SHALL redirect to `/dashboard`. FastAPI SHALL serve `index.html` for all unmatched routes as a SPA fallback.

#### Scenario: Direct navigation to Billing route
- **WHEN** a user navigates directly to `/billing`
- **THEN** the application renders the Billing page inside the authenticated dashboard shell

#### Scenario: Client-side navigation to Billing route
- **WHEN** a user clicks `Billing` from dashboard navigation
- **THEN** the URL changes to `/billing` without a full-page reload
- **AND** the live Billing dashboard is rendered

### ADDED Requirement: Billing page renders live subscription dashboard state
The Billing page SHALL render live subscription dashboard data from the authenticated billing API instead of embedded business-plan constants.

#### Scenario: Billing page shows live subscription summary
- **WHEN** the frontend loads `/billing`
- **AND** `GET /api/billing` returns subscription account data
- **THEN** the page renders plan status, renewal timing, seat counts, and member/account rows from that response
- **AND** it does not rely on bundled mock account constants for the displayed state

#### Scenario: Billing page shows degraded state when live summary is unavailable
- **WHEN** the Billing page cannot load a valid billing summary from `GET /api/billing`
- **THEN** the page shows an explicit loading or error/degraded state
- **AND** it does not silently fall back to static seed data

#### Scenario: Billing page exposes normalized subscription status
- **WHEN** the billing summary includes an account in `trialing`, `active`, `past_due`, `canceled`, or `expired` state
- **THEN** the Billing page renders that normalized state visibly for the affected account
- **AND** it renders the associated renewal or access warning information from the API response
