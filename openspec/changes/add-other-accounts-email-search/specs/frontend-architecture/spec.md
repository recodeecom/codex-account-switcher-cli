## MODIFIED Requirements
### Requirement: Dashboard page
The Dashboard page SHALL display: summary metric cards (requests 7d, tokens, cost, error rate), primary and secondary usage donut charts with legends, account status cards grid, and a recent requests table with filtering and pagination.

#### Scenario: Other accounts can be searched by email
- **WHEN** the dashboard renders non-working accounts in the `Other accounts` section
- **THEN** the section SHALL include an email search input
- **AND** cards SHALL be filtered to accounts whose email contains the search query (case-insensitive)
- **AND** existing `Other accounts` sort mode SHALL still determine the order of the filtered results.

#### Scenario: Other accounts email search provides suggestions and typo correction
- **WHEN** account emails are available in `Other accounts`
- **THEN** the email search input SHALL expose suggestions from available account emails
- **AND** on blur, close typo queries SHALL auto-correct to the nearest known email match.
