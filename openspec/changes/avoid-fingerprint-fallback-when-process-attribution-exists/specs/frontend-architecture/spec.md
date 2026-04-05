### CHANGED Requirement: Dashboard page
Live session attribution SHALL prefer process-level mapped snapshot ownership over mixed default-scope fingerprint fallback.

#### Scenario: Process attribution suppresses mixed fallback
- **WHEN** mapped process session counts are available for at least one snapshot
- **THEN** mixed default-scope fingerprint fallback does not infer extra live sessions for other accounts
- **AND** accounts with zero mapped sessions remain non-working unless they have direct process/runtime ownership.
