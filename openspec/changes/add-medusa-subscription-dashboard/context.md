# Context: Medusa-backed subscription dashboard

## Boundary decision

Phase 1 keeps dashboard authentication and the `/api/billing` HTTP seam in the Python app, but moves subscription truth into Medusa. Stripe remains the financial source of truth for invoice/payment outcomes; Medusa becomes the product-facing source of truth for plan state, seats, entitlements, and billing-event history.

## Why this shape

- The repo already introduced Medusa as a separate commerce boundary.
- The current Python billing module is a seeded placeholder, not a durable subscription system.
- Replacing all operational APIs at once would block delivery.

## Initial delivery shape

The first implementation slice should make live reads real before finishing every mutation path:

1. Medusa can produce a billing summary for known subscription accounts.
2. Python `/api/billing` reads that summary through a dedicated adapter.
3. The frontend Billing page renders real data and explicit degraded states.

## Follow-up work expected after the first slice

- Stripe webhook ingestion and reconciliation jobs.
- Workflow-backed seat mutations and cancellation/reactivation flows.
- Retirement of any remaining Python-owned billing persistence.

## Rollout constraints

- The Python billing facade now depends on a reachable Medusa backend at `CODEX_LB_MEDUSA_BACKEND_URL` (default `http://127.0.0.1:9000`) and expects a live `GET /billing/summary` response.
- When the Medusa summary is unavailable, malformed, or otherwise untrustworthy, the dashboard billing API returns an explicit `503 billing_summary_unavailable` error instead of synthesizing seeded fallback data.
- Direct Python-side billing mutations are intentionally disabled with `billing_mutations_unavailable` until Medusa workflow-backed write paths exist.

## Remaining follow-up

- Add Medusa persistence, migrations, and Stripe reconciliation so the current fixture-backed summary becomes production-backed.
- Introduce workflow-backed seat/member mutations and decide whether the dashboard should call the Python facade or Medusa admin surfaces for those writes.
- Revisit broader frontend workspace typecheck health separately; current repository-wide TypeScript issues are outside this billing slice.
