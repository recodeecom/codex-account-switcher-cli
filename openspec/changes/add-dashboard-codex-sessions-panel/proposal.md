## Why
Operators need quicker visibility into account-level consumption and Codex routing state. Today dashboard account cards do not show total token usage, and Codex sessions are only visible in Settings mixed with other sticky-session kinds.

## What Changes
- Show per-account `totalTokens` usage on dashboard account cards.
- Show per-account Codex session count on dashboard account cards.
- Add a dedicated top-nav `Sessions` page that lists read-only Codex sessions grouped by account.
- Extend sticky-session list payload to include account identity for grouping (`accountId`) and support kind-scoped list requests from the frontend.
- Add backend/frontend test coverage for dashboard card data and Sessions-page behavior.

## Impact
- Operators can compare quota health with real token usage per account directly on Dashboard.
- Operators can inspect Codex session affinity by account from a dedicated panel without touching destructive controls.
- Existing sticky-session delete/purge behavior in Settings remains unchanged.
