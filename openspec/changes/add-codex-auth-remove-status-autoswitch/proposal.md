## Why

The bundled `codex-auth` package currently supports basic snapshot save/use/list/current flows, but operators now need richer account lifecycle and automatic switching behavior:

- remove snapshots with interactive multi-select,
- inspect auto-switch/service/usage status,
- run managed auto-switch that moves away from low-credit accounts.

Without these capabilities, operators must perform manual cleanup and credit monitoring.

## What Changes

- Add `codex-auth remove [<query>|--all]` with interactive multi-select support.
- Add `codex-auth status` to report auto-switch, managed service, thresholds, and usage mode.
- Add auto-switch command surface:
  - `codex-auth config auto enable|disable`
  - `codex-auth config auto --5h <percent> [--weekly <percent>]`
  - `codex-auth config api enable|disable`
  - `codex-auth daemon --watch|--once`
- Introduce sidecar registry metadata at `~/.codex/accounts/registry.json` while keeping snapshot files in `~/.codex/accounts/*.json`.
- Enable managed background watcher per platform (systemd user service, launchd LaunchAgent, Windows Scheduled Task).

## Impact

- Operators can remove/switch/monitor accounts without manual file edits.
- Auto-switch becomes usable for low-credit account rollover.
- Existing snapshot file format and current `save/use/list/current/login` behavior stay compatible.
