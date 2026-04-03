## MODIFIED Requirements
### Requirement: Dashboard exposes sticky-session administration
The system SHALL provide dashboard APIs for listing sticky-session mappings, deleting one mapping, and purging stale mappings.

#### Scenario: List sticky-session mappings includes account identity
- **WHEN** the dashboard requests sticky-session entries
- **THEN** each entry includes `key`, `account_id`, `display_name`, `kind`, `created_at`, `updated_at`, `expires_at`, and `is_stale`
- **AND** the response includes the total number of stale `prompt_cache` mappings that currently exist beyond the returned page

#### Scenario: List sticky-session mappings by kind
- **WHEN** the dashboard requests sticky-session entries with a `kind` filter
- **THEN** only mappings of that sticky-session kind are returned
