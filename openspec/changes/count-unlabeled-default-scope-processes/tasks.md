## 1. Implementation

- [x] 1.1 Add default-scope unlabeled process attribution fallback in `app/modules/accounts/codex_live_usage.py`.
- [x] 1.2 Guard fallback attribution with current-user ownership and process-start-vs-selection recency checks.
- [x] 1.3 Add configurable tolerance for process-start timestamp comparison.
- [x] 1.4 Change deferred mixed-session sample-floor selection to prefer freshest per-window sample.

## 2. Verification

- [x] 2.1 Extend unit tests for:
  - unlabeled default-scope process mapped to active snapshot when process start is recent enough
  - unlabeled process ignored when process start predates current snapshot selection
  - unlabeled foreign-user process ignored
- [x] 2.2 Run `.venv/bin/pytest tests/unit/test_codex_live_usage.py -q`.
- [x] 2.3 Run `.venv/bin/pytest tests/unit/test_live_usage_overrides.py -q`.
- [x] 2.4 Run `openspec validate --specs`.
