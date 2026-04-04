## Why
After clicking **Use this account**, the dashboard can show `Codex CLI sessions = 0` even when a Codex CLI terminal is already running and will use the newly selected snapshot. This happens before fresh rollout telemetry is emitted, which makes the live status feel wrong immediately after switching.

## What Changes
- Add a short-lived process-based fallback for the active snapshot account.
- When snapshot selection was changed recently and a default-scope Codex CLI process is running, mark the active snapshot as live and surface at least one CLI session.
- Keep runtime-scoped (multi-runtime) sessions excluded from this fallback so unrelated terminal profiles do not inflate the active snapshot account.

## Impact
- Account cards better match user expectations right after local account switching.
- The temporary gap before first rollout telemetry no longer shows a misleading zero-session state for the active snapshot.
