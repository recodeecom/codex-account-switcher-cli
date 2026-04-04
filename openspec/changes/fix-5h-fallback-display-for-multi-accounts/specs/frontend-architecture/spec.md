## ADDED Requirements

### Requirement: Account `5h` quota displays avoid synthetic full-reset fallback
Dashboard and Accounts UI surfaces SHALL not synthesize `5h = 100%` solely because `resetAtPrimary` is in the past.

#### Scenario: Past reset keeps reported `5h` value
- **WHEN** an account summary includes `usage.primaryRemainingPercent`
- **AND** `resetAtPrimary` is earlier than the current time
- **THEN** dashboard and accounts surfaces render the provided `primaryRemainingPercent` value
- **AND** they do not replace it with `100%`.

#### Scenario: Missing primary sample remains unknown
- **WHEN** an account summary has no non-weekly primary sample
- **THEN** the API returns `usage.primaryRemainingPercent = null`
- **AND** dashboard and accounts surfaces render `5h` as unknown (`--`) rather than `100%`.
