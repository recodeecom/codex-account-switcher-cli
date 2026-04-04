## Why
Some local machines still become unstable during `./redeploy.sh` Docker builds even with current low-memory guardrails, especially when swap is near empty or when memory telemetry cannot be read reliably.

## What Changes
- Make parallel-build admission more conservative by requiring both RAM and swap headroom.
- Add a dedicated parallel-build swap threshold (`CODEX_LB_PARALLEL_BUILD_MIN_SWAP_MB`).
- Default to serial build mode when memory telemetry is unavailable (unless parallel mode is explicitly forced).
- Update redeploy docs/help text and add regression tests for swap-pressure and missing-meminfo fallback behavior.

## Impact
- Reduces host lockups during local redeploy runs.
- Keeps explicit `--parallel-build` and `CODEX_LB_FORCE_PARALLEL_BUILD=true` overrides available for operators who want speed over safety.
