## 1. Specification and contract foundation

- [x] 1.1 Add the proposal, design, context, and delta specs for the Medusa-backed subscription dashboard change.
- [x] 1.2 Validate the OpenSpec artifacts with `openspec validate --specs`.

## 2. Medusa subscription domain foundation

- [x] 2.1 Add the initial Medusa `subscription` module types, models, service, and configuration registration.
- [x] 2.2 Add a Medusa billing-summary workflow and API route that expose subscription account, seat, renewal, and entitlement state.
- [x] 2.3 Add Medusa tests and fixture-backed data for the initial subscription summary read path.

## 3. Python billing facade migration

- [x] 3.1 Replace Python seed-on-read billing behavior with a Medusa-backed facade/adapter and cover the new behavior with tests.
- [x] 3.2 Add explicit entitlement/degraded-state handling in the billing facade so inactive, expired, or unavailable subscription state fails closed.

## 4. Frontend live billing dashboard

- [x] 4.1 Replace hard-coded Billing page data with live query-backed API data and update the billing schemas/hooks accordingly.
- [x] 4.2 Add or update frontend tests for live subscription status, renewal details, and degraded/error states.

## 5. Verification and rollout notes

- [x] 5.1 Run OpenSpec, backend, and frontend verification commands and fix any regressions.
- [x] 5.2 Record rollout constraints and remaining follow-up work in the change context notes.
