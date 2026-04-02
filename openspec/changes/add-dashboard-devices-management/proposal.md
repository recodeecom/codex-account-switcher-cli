## Why

Operators need a simple dashboard surface to track internal devices by name and IP address. Today there is no dedicated Devices navigation tab or CRUD API, so device inventory cannot be managed from the UI.

## What Changes

- Add a new top-level `Devices` route and navigation item in the React dashboard.
- Add a backend dashboard API for listing, creating, and deleting devices.
- Persist device entries in the database with strict IP validation and uniqueness for device name and IP.
- Add frontend and backend tests covering devices CRUD behavior.

## Impact

- Code: `app/modules/devices/*`, `app/dependencies.py`, `app/main.py`, `frontend/src/features/devices/*`, `frontend/src/App.tsx`, `frontend/src/components/layout/app-header.tsx`
- Migrations: add Alembic revision to create `devices` table for migrated environments
- Tests: backend unit/integration tests + frontend integration/MSW coverage updates
- Specs: `openspec/specs/frontend-architecture/spec.md`
