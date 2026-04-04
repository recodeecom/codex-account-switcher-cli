## 1. Specification

- [x] 1.1 Add OpenSpec change `improve-working-now-task-preview-signal` for immediate working-now detection via task preview evidence.

## 2. Frontend implementation

- [x] 2.1 Extend `hasActiveCliSessionSignal` / `isAccountWorkingNow` to recognize fresh `codexCurrentTaskPreview` as an active-session signal.
- [x] 2.2 Preserve deferred mixed-session raw-sample false-positive protections when no stronger signal exists.

## 3. Validation

- [x] 3.1 Update unit/component tests for deferred mixed-session + task-preview behavior.
- [x] 3.2 Run targeted frontend tests for working detection and dashboard cards.
- [x] 3.3 Run `openspec validate --specs`.
