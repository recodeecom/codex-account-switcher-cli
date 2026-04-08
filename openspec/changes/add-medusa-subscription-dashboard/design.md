## Context

The repo already separates commerce work into `apps/backend` (Medusa) while the Python app in `app/` owns dashboard authentication and operational APIs. The current Billing surface breaks that intended boundary: the frontend page uses hard-coded business-plan data and the Python billing service seeds default accounts into `BusinessBillingAccount` when the table is empty. That makes `/billing` look real without any subscription source of truth, renewal flow, or entitlement enforcement.

At the same time, Medusa does not ship built-in subscriptions, so the change must explicitly define a custom subscription domain instead of assuming core Medusa coverage. The safest path is to keep the existing authenticated `/api/billing` seam for the dashboard while moving billing ownership behind it into Medusa.

## Goals / Non-Goals

**Goals:**
- Make Billing data live and Medusa-backed.
- Introduce a Medusa subscription domain for subscription accounts, seats, entitlements, and billing-event history.
- Keep dashboard auth/session validation in the Python app for phase 1.
- Preserve a stable frontend billing API seam while the source of truth moves behind it.
- Add explicit degraded-state and entitlement behavior for inactive, expired, or stale subscription state.

**Non-Goals:**
- Migrate all Python dashboard APIs into Medusa.
- Build full finance/accounting exports.
- Replace Stripe as payment/invoice authority in this change.
- Finish every long-tail admin mutation flow before a live read model exists.

## Decisions

### 1. Medusa owns subscription state; Python owns only the authenticated dashboard facade
We will keep `GET /api/billing` in the Python app because it already sits behind dashboard session middleware, but the route will stop treating Python persistence as billing truth. Instead, it will resolve a Medusa-backed adapter/service to fetch subscription summaries and, for later mutations, forward workflow-backed commands.

**Why:** This preserves the current dashboard auth surface and minimizes blast radius while moving commerce logic into the intended backend.

**Alternative considered:** Move the entire billing/dashboard backend into Medusa now. Rejected because it expands scope into non-commerce operational APIs and conflicts with the repo's current hybrid boundary.

### 2. Add a custom Medusa subscription module with a read model shaped for dashboard use
The Medusa backend will gain a `subscription` module containing the initial custom data models and service needed to hold subscription account records, seat/member assignments, entitlement state, and billing-event history. The first implementation slice will expose a billing-summary read API and a fixture-backed seed path suitable for development and tests.

**Why:** Medusa modules are the supported extension point for domain data and are the right place to concentrate billing rules before routes/workflows are added.

**Alternative considered:** Keep using `BusinessBillingAccount` as the primary store and mirror into Medusa later. Rejected because it would deepen the temporary architecture instead of shrinking it.

### 3. Frontend Billing should fail visibly instead of silently falling back to static data
The Billing page will switch to query-driven data reads. If the backend cannot provide a live subscription summary, the UI should show a degraded/error state instead of rendering the old static mock data.

**Why:** Silent fallback would hide broken subscription ownership and make rollout failures harder to detect.

### 4. Server-side entitlement state must be explicit in the billing contract
The authenticated billing summary returned to the dashboard will include normalized subscription status and entitlement flags so the Python app can enforce premium access server-side and the frontend can render accurate plan state.

**Why:** UI-only checks are insufficient for premium feature gating, especially around past-due or expired subscriptions.

## Risks / Trade-offs

- **[Risk] Python and Medusa account identities drift** → Introduce a stable `account_id`/domain mapping in the Medusa summary contract and keep Python as a thin translator only.
- **[Risk] Billing appears live before Medusa mutation flows exist** → Treat the first slice as read-model-first; document mutations as follow-up tasks and keep Python write paths constrained.
- **[Risk] Frontend schema churn causes a noisy rollout** → Preserve the existing `/api/billing` envelope and evolve it additively with typed schemas.
- **[Risk] Developers keep using seeded Python defaults unintentionally** → Remove implicit seed-on-read behavior and cover it with tests.

## Migration Plan

1. Write the OpenSpec change artifacts and validate them.
2. Add the Medusa `subscription` module and register it in `medusa-config.ts`.
3. Add a Medusa billing-summary read route/workflow plus development fixture data for tests.
4. Replace Python billing seed-on-read behavior with a Medusa-backed facade/adaptor and explicit error/degraded handling.
5. Update the frontend Billing page to query `/api/billing` instead of consuming embedded constants.
6. Add tests for the Python facade, Medusa summary route/module, and live frontend rendering.
7. Run targeted verification and keep rollout context in OpenSpec notes.

## Open Questions

- Which Stripe identifiers already exist in the Medusa deployment and should become the canonical financial references in the subscription read model?
- Should the first shipped mutation flow be seat reassignment or cancel/reactivate, given current frontend affordances?
- Do we want the Medusa summary route to be consumed only by the Python facade, or also by other internal admin surfaces later?
