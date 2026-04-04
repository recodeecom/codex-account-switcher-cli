## MODIFIED Requirements
### Requirement: Sessions page
The Sessions page SHALL display read-only Codex sessions grouped by account using sticky-session data filtered to `codex_session` kind.

#### Scenario: Fallback session rows keep per-account current task previews in mixed default-session mode
- **WHEN** sticky codex-session mappings are empty and `/sessions` falls back to dashboard overview telemetry
- **AND** multiple accounts have active default-session telemetry attribution
- **THEN** each account row with an attributed live rollout session exposes `codexCurrentTaskPreview` in overview payloads
- **AND** the Sessions fallback table renders that task preview per account instead of a global active-snapshot-only preview
