## 1. Implementation

- [x] 1.1 Remove frontend normalization that forces `5h` remaining to `100%` when reset time is in the past.
- [x] 1.2 Keep backend `primaryRemainingPercent` as `null` when no non-weekly primary usage sample exists.
- [x] 1.3 Apply the updated `5h` semantics across dashboard/account surfaces that consume shared quota display logic.

## 2. Validation

- [x] 2.1 Update frontend tests that expected reset-past `5h=100%` behavior.
- [x] 2.2 Add backend integration coverage for missing-primary semantics.
- [x] 2.3 Run targeted frontend + backend tests and `openspec validate --specs`.
