## 1. Implementation

- [x] 1.1 Add per-account/window floor cache in frontend quota display normalization.
- [x] 1.2 Reset floor when reset cycle changes and keep stale-telemetry null behavior.
- [x] 1.3 Wire account IDs into dashboard/accounts call sites so the floor applies consistently.
- [x] 1.4 Add cache reset hooks for test isolation.

## 2. Validation

- [x] 2.1 Add/extend unit tests for monotonic floor behavior and reset rollover.
- [x] 2.2 Run targeted frontend tests for quota display and account list surfaces.
- [x] 2.3 Run frontend typecheck and lint.
