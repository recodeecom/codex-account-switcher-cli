## Why

Some active Codex terminals run in the default auth scope without explicit runtime snapshot environment variables. Those sessions are currently ignored by process-based live mapping, so an actually running account can disappear from `Working now` and show `0` live sessions.

## What Changes

- Add a conservative fallback for unlabeled default-scope Codex processes.
- Attribute an unlabeled process to the currently selected default snapshot only when:
  - the process is owned by the current user, and
  - the process appears to have started at/after the latest default snapshot selection timestamp (with a small tolerance).
- Keep explicit snapshot/runtime metadata as the primary attribution path.

## Impact

- Active default-scope terminals are no longer silently dropped from live account telemetry.
- Cross-user and stale pre-switch process attribution remains guarded.
