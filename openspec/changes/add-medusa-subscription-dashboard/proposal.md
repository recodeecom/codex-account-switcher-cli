## Why

The current `/billing` experience is still a mocked seat-management page backed by seeded Python defaults, while the repo already contains a separate Medusa commerce backend intended to own commerce concerns. We need to turn Billing into a real subscription dashboard now so seat counts, renewal state, and entitlement checks come from the commerce boundary instead of hard-coded or bulk-replaced local records.

## What Changes

- Add a Medusa-owned `subscription-billing` capability for subscription accounts, seats, entitlements, and billing-event synchronization.
- Change the authenticated dashboard billing contract so `/api/billing` becomes a thin facade over Medusa subscription data instead of a Python-owned source of truth.
- Upgrade the frontend Billing page from static seat-management data to a live subscription dashboard that shows plan status, renewal timing, payment state, and seat/member details.
- Add server-side entitlement enforcement so inactive or expired subscriptions do not rely on frontend-only gating.
- Add verification and operational context for Medusa module ownership, Stripe synchronization, and rollout safety.

## Capabilities

### New Capabilities
- `subscription-billing`: Defines Medusa as the source of truth for subscription accounts, seat assignments, entitlement state, billing-event ingestion, and billing-facing summary reads.

### Modified Capabilities
- `frontend-architecture`: The Billing route and page change from a static seat-management mock to a live subscription dashboard backed by the authenticated billing API.

## Impact

- OpenSpec: `openspec/changes/add-medusa-subscription-dashboard/**`, `openspec/specs/frontend-architecture/spec.md`, new `openspec/specs/subscription-billing/*`
- Medusa backend: `apps/backend/medusa-config.ts`, `apps/backend/src/modules/subscription/**`, `apps/backend/src/api/**`, `apps/backend/src/workflows/**`
- Python dashboard facade: `app/modules/billing/*`, `app/dependencies.py`
- Frontend Billing UI: `apps/frontend/src/features/billing/*`, related navigation/tests
- Verification: backend Jest suites, frontend Vitest/typecheck/lint, `openspec validate --specs`
