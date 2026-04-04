### ADDED Requirement: Redeploy parallel builds require RAM and swap headroom
The redeploy workflow SHALL run Docker builds in parallel only when available RAM and available swap both meet configured safety thresholds.

#### Scenario: Swap pressure disables parallel build
- **WHEN** an operator runs `./redeploy.sh` in turbo mode
- **AND** available RAM meets the configured parallel-build minimum
- **AND** available swap is below the configured parallel-build swap minimum
- **THEN** redeploy switches to sequential Docker builds
- **AND** prints a message indicating low-swap fallback to serial mode

### ADDED Requirement: Redeploy defaults to serial when memory telemetry is unavailable
The redeploy workflow SHALL prefer serial Docker builds when memory telemetry cannot be read, unless an explicit parallel override is provided.

#### Scenario: Missing meminfo falls back to serial
- **WHEN** an operator runs `./redeploy.sh`
- **AND** the configured meminfo source cannot be read
- **THEN** redeploy uses sequential Docker builds by default
- **AND** the run remains force-overridable via `--parallel-build` or `CODEX_LB_FORCE_PARALLEL_BUILD=true`
