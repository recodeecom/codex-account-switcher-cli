## 1. Specification

- [x] 1.1 Add OpenSpec change `keep-working-now-active-cli-sessions` describing session-priority working-now behavior.

## 2. Frontend implementation

- [x] 2.1 Update `isAccountWorkingNow` to keep active CLI-session accounts in `Working now` even when primary 5h rounds to 0.
- [x] 2.2 Keep non-session accounts excluded from `Working now` when primary 5h rounds to 0.

## 3. Validation

- [x] 3.1 Update unit/component tests for 5h-zero + active-session behavior.
- [x] 3.2 Run targeted frontend tests for working detection and dashboard cards.
- [x] 3.3 Run frontend lint and typecheck.
- [x] 3.4 Run `openspec validate --specs`.
