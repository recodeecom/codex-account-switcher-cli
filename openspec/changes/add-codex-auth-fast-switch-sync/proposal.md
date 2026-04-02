## Why

Operators who juggle multiple Codex accounts currently perform a slow multi-step flow:

1. run `codex-auth use <name>`
2. manually upload the selected snapshot into codex-lb
3. repeat dashboard login/TOTP when required

The friction discourages keeping codex-lb account entries fresh after token refreshes.

## What Changes

- Add new operator CLI commands: `codex-lb-switch` and `codex-lb-sync-all`.
- `codex-lb-switch` runs `codex-auth use <name>` and immediately imports `~/.codex/accounts/<name>.json` into codex-lb.
- `codex-lb-sync-all` imports all `~/.codex/accounts/*.json` snapshots in one run.
- Support dashboard-auth-protected environments by logging in via password and optional TOTP when needed.
- Document the fast-switch flow in the README.

## Impact

- Switching and syncing an account becomes one command.
- Token refresh workflows become much faster and less error-prone.
- No changes to proxy request routing logic or account selection strategy.
