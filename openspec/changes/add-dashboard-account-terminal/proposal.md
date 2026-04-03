## Why
Operators can switch the local Codex snapshot from dashboard cards, but they still need to manually open a shell and run `codex` after switching.

## What Changes
- Add a dashboard account-card **Terminal** action that opens an in-app terminal modal.
- Use xterm.js in the frontend to provide a VS Code-like terminal UI.
- Add a backend websocket endpoint that:
  - switches to the selected account snapshot (same behavior as `Use this account`)
  - launches a PTY session
  - starts `codex` in that PTY and streams input/output.
- Add backend/frontend tests for terminal action wiring and websocket terminal behavior.

## Impact
- Operators can switch + launch Codex in one action from the dashboard.
- No changes to request routing or quota semantics.
