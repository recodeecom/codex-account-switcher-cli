## ADDED Requirements

### Requirement: Medusa owns subscription dashboard source-of-truth records
The system SHALL maintain subscription dashboard records in the Medusa commerce backend for each billed account shown in the Billing dashboard.

#### Scenario: Medusa provides a subscription summary for a billed account
- **WHEN** a billed account exists in the commerce backend
- **THEN** Medusa can return the account's normalized subscription status, billing cycle timing, seat counts, and member assignments

#### Scenario: Expired subscription is not entitled
- **WHEN** a billed account's normalized subscription status is `expired` or `canceled`
- **THEN** the commerce summary marks the account as not entitled for premium dashboard access

### Requirement: Authenticated billing API reads Medusa-backed subscription summaries
The dashboard billing API SHALL return authenticated subscription summaries that are read from the Medusa subscription domain instead of Python-seeded billing defaults.

#### Scenario: Billing API returns Medusa-backed account summaries
- **WHEN** an authenticated dashboard session calls `GET /api/billing`
- **THEN** the response includes account summaries derived from the Medusa subscription domain
- **AND** each account summary includes normalized subscription status and entitlement information

#### Scenario: Billing API fails closed when subscription state is unavailable
- **WHEN** the authenticated billing facade cannot obtain a trustworthy Medusa subscription summary
- **THEN** it returns an explicit error or degraded-state response
- **AND** it does not synthesize a fresh success payload from Python-owned seed defaults

### Requirement: Subscription seat and entitlement state is workflow-backed
Subscription seat and entitlement changes SHALL be applied through Medusa workflows rather than direct bulk replacement of Python billing rows.

#### Scenario: Seat state changes preserve account consistency
- **WHEN** a subscription seat assignment is changed
- **THEN** the resulting account summary reflects updated seat counts and entitlement state as one coherent workflow result

#### Scenario: Duplicate or conflicting seat mutations are rejected
- **WHEN** a seat mutation would create a conflicting duplicate member/seat assignment for the same billed account
- **THEN** the mutation fails with an explicit validation error
- **AND** the existing account summary remains unchanged
