## MODIFIED Requirements

### Requirement: Dashboard per-account local codex-auth switch

The dashboard and accounts UI SHALL expose a per-account action that attempts to switch the host's active Codex login using `codex-auth use <snapshot>`.

#### Scenario: Use this action is enabled for active accounts with at least 1% 5h quota

- **WHEN** an account status resolves to `active`
- **AND** `primary_remaining_percent >= 1`
- **THEN** the UI shows **Use this** as enabled/green for that account

#### Scenario: Use this action is disabled for non-active status or missing 5h quota

- **WHEN** account status is not `active`
- **OR** `primary_remaining_percent` is missing/zero
- **THEN** the UI shows **Use this** as disabled/gray
- **AND** provides an explanatory reason

#### Scenario: Snapshot availability is validated at action time

- **WHEN** an account is active with at least 1% 5h quota but no matched codex-auth snapshot exists
- **THEN** the UI still allows clicking **Use this**
- **AND** the switch request can return a snapshot-not-found error
- **AND** the UI routes to `/accounts?selected=<accountId>` for remediation
