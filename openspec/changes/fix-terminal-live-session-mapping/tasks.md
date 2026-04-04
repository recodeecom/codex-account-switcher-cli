## 1. Specification

- [x] 1.1 Add OpenSpec change `fix-terminal-live-session-mapping` with frontend-architecture requirement updates for live-vs-tracked semantics.

## 2. Backend

- [ ] 2.1 Add process-based live session mapping in `app/modules/accounts/codex_live_usage.py` that maps running codex processes to snapshots using explicit process metadata.
- [ ] 2.2 Ignore unlabeled/manual codex processes without explicit snapshot/runtime metadata.
- [ ] 2.3 Split account session counters into live vs tracked in accounts/dashboard services and mappers.
- [ ] 2.4 Expose `codexLiveSessionCount` and `codexTrackedSessionCount`; keep `codexSessionCount` as compatibility alias to live.
- [ ] 2.5 Ensure `codexAuth.hasLiveSession` is sourced from live mapping (not tracked fallback).

## 3. Frontend

- [ ] 3.1 Extend account schemas/types for live/tracked counters.
- [ ] 3.2 Use live-only signal for `Working now`, fast polling, and primary card session number.
- [ ] 3.3 Keep Sessions action available when tracked sessions exist and show tracked count text on card.
- [ ] 3.4 Make Sessions-page fallback inventory use tracked counts, with live badge still sourced from `hasLiveSession`.

## 4. Validation

- [ ] 4.1 Add/update backend tests for process live mapping, payload fields, compatibility alias, and tracked-only behavior.
- [ ] 4.2 Add/update frontend tests for working-now/live-only behavior, tracked text, Sessions button availability, and polling trigger rules.
- [ ] 4.3 Run targeted backend/frontend test suites.
- [ ] 4.4 Run `openspec validate --specs`.
