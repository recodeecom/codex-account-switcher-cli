## MODIFIED Requirements
### Requirement: Account card codex session counters
Codex session counters in account payloads SHALL represent active codex sessions only.

#### Scenario: Active snapshot switch fallback marks immediate live Codex session presence
- **WHEN** an account is the active snapshot account
- **AND** rollout telemetry has not yet produced an active live-session sample for that snapshot
- **AND** the active snapshot selection was changed within the fallback recency window
- **AND** at least one default-scope Codex CLI process is running
- **THEN** `accounts[].codexAuth.hasLiveSession` MUST be `true` for that active snapshot account
- **AND** `accounts[].codexSessionCount` MUST be at least `1`

#### Scenario: Runtime-scoped Codex profiles do not trigger active-snapshot fallback
- **WHEN** a running Codex process uses runtime-scoped `CODEX_AUTH_CURRENT_PATH` or `CODEX_AUTH_JSON_PATH` that differs from the default scope
- **THEN** that process MUST NOT contribute to the active-snapshot process fallback counter
