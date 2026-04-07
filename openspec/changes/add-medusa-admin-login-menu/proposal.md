## Why

Operators want to sign in to the Medusa backend admin directly from the account menu shown in the dashboard header, so they can quickly authenticate with Medusa admin credentials without leaving the app.

## What Changes

- Add a Medusa admin sign-in action in the account dropdown menu.
- Add a modal dialog that collects Medusa admin email and password.
- Authenticate against Medusa backend `POST /auth/user/emailpass`, then validate session by fetching `GET /admin/users/me`.
- Show signed-in Medusa admin email in the account menu and allow Medusa sign-out (local token clear).

## Impact

- Code: `apps/frontend/src/components/layout/account-menu.tsx`, `apps/frontend/src/features/medusa-auth/*`
- Tests: new Medusa auth schema/hook/dialog tests
- Specs: `openspec/specs/frontend-architecture/spec.md`
