### ADDED Requirement: codex-auth switch fallback without CLI binary
The backend SHALL support switching to a resolved snapshot even when the `codex-auth` command is unavailable.

#### Scenario: CLI missing but snapshot exists
- **WHEN** `codex-auth use <snapshot>` cannot be executed because the binary is missing
- **AND** the resolved snapshot file exists
- **THEN** the backend updates `CODEX_AUTH_CURRENT_PATH` with the snapshot name
- **AND** updates `CODEX_AUTH_JSON_PATH` to point at the selected snapshot (symlink or copied file)
- **AND** account switch returns success

#### Scenario: CLI missing and fallback cannot complete
- **WHEN** `codex-auth` is unavailable
- **AND** fallback cannot resolve or write required auth files
- **THEN** the backend returns a codex-auth-not-installed style error
