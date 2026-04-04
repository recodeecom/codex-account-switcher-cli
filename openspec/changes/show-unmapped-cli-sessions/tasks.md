## 1. Specification

- [x] 1.1 Add OpenSpec change `show-unmapped-cli-sessions` for sessions-page orphan CLI visibility.

## 2. Backend implementation

- [x] 2.1 Extend sticky-sessions response schema/service to include unmapped CLI snapshot sessions.
- [x] 2.2 Add backend integration test coverage for unmapped CLI session payload.

## 3. Frontend implementation

- [x] 3.1 Extend sticky-sessions frontend schemas to parse `unmappedCliSessions`.
- [x] 3.2 Update Sessions page UI to render unmapped CLI session rows when present.
- [x] 3.3 Add frontend integration coverage for unmapped CLI section rendering.

## 4. Validation

- [x] 4.1 Run targeted backend integration tests for sticky sessions API.
- [x] 4.2 Run targeted frontend sessions integration tests.
- [x] 4.3 Run frontend lint and typecheck.
- [x] 4.4 Run `openspec validate --specs`.
