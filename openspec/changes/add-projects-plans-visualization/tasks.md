## 1. Spec

- [ ] 1.1 Capture/confirm frontend architecture requirements for Projects -> Plans submenu and plans visualization data contract
- [ ] 1.2 Extend the plan-visualization contract to cover role canonicalization (`designer` included), active checkpoint resume pointer, and aggregate percent progress
- [ ] 1.3 Validate OpenSpec changes (`openspec validate --specs`)

## 2. Tests

- [ ] 2.1 Add backend integration tests for plans list/detail APIs and error handling
- [ ] 2.2 Add backend assertions for aggregate progress percentage + current checkpoint pointer resolution
- [ ] 2.3 Add frontend integration tests for Plans navigation and visualization
- [ ] 2.4 Add frontend assertions for progress bar percentage and “where left off” checkpoint card states
- [ ] 2.5 Update frontend MSW handler coverage for new plans endpoints/fields

## 3. Implementation

- [ ] 3.1 Implement backend plans reader/service/API and wire router
- [ ] 3.2 Add backend structured progress fields (`overallProgress`, `currentCheckpoint`) and designer-aware role ordering
- [ ] 3.3 Implement frontend nav submenu + `/projects/plans` route + Plans page feature
- [ ] 3.4 Update frontend API/hook/schemas for expanded plans contract
- [ ] 3.5 Render progress bar + current checkpoint summary UI while preserving existing summary/checkpoints markdown panes
