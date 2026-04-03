## Why

Codexina needs clearer product positioning as a codex account manager and switcher, and the UI needs an explicit placeholder navigation surface for upcoming secure storage capabilities.

## What Changes

- Add a new top-level `Storage (coming soon)` navigation item and `/storage` route in the frontend.
- Add a Storage placeholder page that communicates upcoming secure storage for devices and API environment values.
- Update visible Codexina branding copy (header + auth gate) to reflect account management, switching, and usage/token monitoring positioning.

## Impact

- Code: `frontend/src/components/layout/app-header.tsx`, `frontend/src/App.tsx`, `frontend/src/features/auth/components/auth-gate.tsx`, `frontend/src/features/storage/components/storage-page.tsx`, `frontend/src/__integration__/storage-flow.test.tsx`
- Tests: frontend integration coverage for new Storage route/navigation
- Specs: `openspec/specs/frontend-architecture/spec.md` (via change delta)
