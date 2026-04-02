## Why

Operators want Codex traffic to avoid nearly exhausted accounts (for example <5% remaining) without forcing active sessions to bounce between accounts.

Current behavior can reassign an existing prompt-cache sticky mapping once the pinned account crosses the budget threshold. That can break continuity and reduce cache locality for ongoing work.

## What Changes

- Apply the budget threshold only when creating a **new** prompt-cache sticky mapping.
- Keep existing prompt-cache sticky mappings pinned unless the pinned account becomes unavailable by existing outage/deletion rules.
- Expose `stickyReallocationBudgetThresholdPct` in the Settings UI Routing section so operators can configure this threshold from the dashboard.

## Impact

- New sessions avoid low-budget accounts.
- Existing sessions remain stable on their pinned account.
- Routing policy becomes operator-configurable in the dashboard without backend API changes.
