## ADDED Requirements

### Requirement: Usage refresh retries invalidated-token 401 before deactivation
When usage polling receives a `401` response with an invalidated-token marker and auth refresh
is available, the system SHALL attempt one forced token refresh and retry usage fetch before
marking the account deactivated.

#### Scenario: Invalidated-token 401 recovers after forced refresh retry
- **WHEN** the first usage fetch returns `401` with an invalidated-token marker
- **AND** forced refresh succeeds
- **AND** the immediate retry usage fetch succeeds
- **THEN** the account remains active
- **AND** usage refresh proceeds without writing a deactivation reason.

#### Scenario: Invalidated-token 401 still fails after forced refresh retry
- **WHEN** the first usage fetch returns `401` with an invalidated-token marker
- **AND** forced refresh succeeds
- **AND** the retry usage fetch still returns a deactivation-worthy `401` client error
- **THEN** the account increments the client-error deactivation streak
- **AND** it is deactivated only after repeated failures reach the configured threshold.

#### Scenario: Invalidated-token 401 without refresh capability
- **WHEN** usage fetch returns `401` with an invalidated-token marker
- **AND** auth refresh is unavailable for that updater instance
- **THEN** the system preserves existing client-error deactivation handling.
