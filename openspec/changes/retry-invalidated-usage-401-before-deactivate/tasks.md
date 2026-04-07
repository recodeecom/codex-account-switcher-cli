## 1. Usage refresh flow
- [x] 1.1 Route invalidated-token `401` responses through one forced refresh attempt when auth manager is available.
- [x] 1.2 Preserve repeated-failure deactivation behavior (streak threshold) when retry still fails with invalidated/deactivation-worthy client errors.
- [x] 1.3 Keep no-auth-manager fallback behavior unchanged.

## 2. Regression coverage
- [x] 2.1 Update invalidated-token tests to assert forced-refresh retry occurs before deactivation.
- [x] 2.2 Add regression coverage for recoverable invalidated-token first-pass `401` that succeeds after refresh retry.
- [x] 2.3 Keep sibling-spam cooldown coverage aligned with the retry behavior.

## 3. Verification
- [x] 3.1 Run targeted unit tests for `tests/unit/test_usage_updater.py`.
- [x] 3.2 Run targeted lint/type checks for changed backend files.
- [x] 3.3 Validate specs with `openspec validate --specs`.
