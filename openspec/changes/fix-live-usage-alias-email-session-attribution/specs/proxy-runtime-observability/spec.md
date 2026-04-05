## MODIFIED Requirements

### Requirement: Live usage XML observability feed
The system SHALL expose XML health feeds for codex CLI runtime session visibility.

#### Scenario: Alias snapshot metadata remains aligned in live usage XML
- **WHEN** `/live_usage` remaps live session attribution from an alias snapshot name to a selected snapshot name
- **THEN** `account_emails` metadata SHALL be emitted under that same selected snapshot row
- **AND** the alias snapshot row SHALL NOT be emitted solely because of un-remapped email metadata.

#### Scenario: Live usage XML payload echoes do not become session task previews
- **WHEN** task preview sources include raw `<live_usage ...>` or `<live_usage_mapping ...>` payload text
- **THEN** `/live_usage` SHALL treat those payload echoes as non-task noise
- **AND** affected session rows SHALL remain in `waiting_for_new_task` state unless another real task preview exists.
