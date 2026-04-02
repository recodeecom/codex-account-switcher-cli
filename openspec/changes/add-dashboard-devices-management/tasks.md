## 1. Spec

- [x] 1.1 Add frontend architecture requirement for devices route and device management flow
- [ ] 1.2 Validate OpenSpec changes *(blocked: `openspec` CLI not installed in this environment)*

## 2. Tests

- [x] 2.1 Add backend unit tests for device validation and duplicate handling
- [x] 2.2 Add backend integration tests for devices API CRUD and error mapping
- [x] 2.3 Add frontend integration flow test for devices page and update MSW handler coverage

## 3. Implementation

- [x] 3.1 Implement backend devices repository/service/API and wire dependencies/router
- [x] 3.2 Add Alembic migration to create devices table on migrated databases
- [x] 3.3 Implement frontend devices feature (route, nav item, page, API/hook schemas)
