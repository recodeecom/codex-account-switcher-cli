## 1. Implementation

- [ ] 1.1 Remove volatile rollout source identifiers from usage-limit grace session fingerprinting.
- [ ] 1.2 Keep grace timing stable when telemetry files rotate but session identity remains the same.
- [ ] 1.3 Hide stale dashboard `Current task` preview once usage-limit grace expires.

## 2. Validation

- [ ] 2.1 Add/update unit tests for rotated-source grace non-reset behavior.
- [ ] 2.2 Add/update account-card tests for stale task preview hiding after grace expiry.
- [ ] 2.3 Run targeted frontend test suite for account working/account card behavior.
- [ ] 2.4 Run `openspec validate --specs`.
