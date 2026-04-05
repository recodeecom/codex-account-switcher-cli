## MODIFIED Requirements

### Requirement: Live usage XML observability feed
The system SHALL expose XML health feeds for codex CLI runtime session visibility.

#### Scenario: auth.json email fallback maps otherwise unattributed live sessions
- **WHEN** a live Codex process has no explicit snapshot marker (`CODEX_AUTH_ACTIVE_SNAPSHOT`, runtime `current`, or non-`auth.json` auth pointer)
- **AND** the process auth file resolves to `auth.json` with a valid account email identity
- **THEN** live session attribution SHALL map that process to a deterministic email-derived snapshot name
- **AND** the snapshot file SHALL be materialized under the codex-auth accounts directory when missing
- **AND** the process SHALL not be emitted under `<unattributed_sessions>` solely due to missing explicit snapshot marker.
