## MODIFIED Requirements
### Requirement: Live usage XML observability feed
The system SHALL expose XML health feeds for codex CLI runtime session visibility.

#### Scenario: Waiting session rows can include last known task context
- **WHEN** an operator calls `GET /live_usage`
- **AND** a mapped or unattributed live session row has no active task preview and is emitted with `state="waiting_for_new_task"`
- **AND** a safe last-known task preview is available for that row
- **THEN** the session row SHALL keep `state="waiting_for_new_task"`
- **AND** the session row SHALL additionally include `last_task_preview="..."`
- **AND** explicit clear/status-only messages SHALL continue to suppress stale task resurrection
