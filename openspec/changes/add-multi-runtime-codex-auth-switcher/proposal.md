## Why

Today `codex-auth` switching is effectively global for one local profile (`~/.codex/auth.json`).
That makes it hard to run two terminals against different accounts at the same time.

We need a first-party runtime-scoped switcher so each terminal can use an isolated auth/profile path while still reusing saved snapshots.

## What Changes

- Add a new CLI package entrypoint: `codex-lb-runtime`.
- Provide runtime-scoped commands to:
  - print/export runtime-specific `CODEX_AUTH_*` environment variables,
  - switch a runtime to a selected snapshot,
  - run any command in a runtime-scoped auth environment.
- Keep snapshot source directory shared by default (`~/.codex/accounts`) while isolating active auth/current pointers per runtime under `~/.codex/runtimes/<runtime>/`.
- Optionally sync the selected snapshot into codex-lb dashboard when switching.

## Impact

- Operators can run multiple terminals on different accounts concurrently.
- Existing `codex-lb-switch` and dashboard APIs remain unchanged.
- No database schema/API contract changes.
