## 1. Implementation

- [x] 1.1 Add an "Other accounts" email search input with suggestion support.
- [x] 1.2 Filter non-working account cards by email query while preserving the selected sort mode.
- [x] 1.3 Add typo autocorrection for close email matches on input blur.

## 2. Verification

- [x] 2.1 Add/adjust frontend tests for filtering, suggestions, and autocorrection behavior.
- [x] 2.2 Run `bun run lint` in `apps/frontend`.
- [x] 2.3 Run targeted Vitest coverage for new tests:
  - `bun run test -- src/features/dashboard/components/account-cards.test.tsx -t "filters Other accounts by email search|offers email suggestions and autocorrects close email typos"`
- [ ] 2.4 Run full `account-cards` test file once unrelated baseline failures are resolved.
- [x] 2.5 Run `openspec validate --specs`.
