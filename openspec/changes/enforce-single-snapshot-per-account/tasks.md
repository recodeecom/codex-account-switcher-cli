## 1. Implementation

- [x] 1.1 Enforce single effective snapshot selection in `resolve_snapshot_names_for_account`.
- [x] 1.2 Ensure existing selection precedence still determines which snapshot is retained.

## 2. Validation

- [x] 2.1 Update unit tests for conflict scenarios to assert exactly one resolved snapshot.
- [x] 2.2 Run targeted unit tests for codex-auth snapshot selection logic.
- [x] 2.3 Run `openspec validate --specs`.
