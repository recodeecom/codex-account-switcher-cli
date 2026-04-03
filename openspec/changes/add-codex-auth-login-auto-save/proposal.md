## Why

Operators currently run `codex login` and then must remember to run `codex-auth save <name>` as a second manual step.
Missing that second step means refreshed tokens are not captured as reusable account snapshots.

## What Changes

- Add a `codex-auth login <name>` command that wraps `codex login`.
- When `codex login` succeeds, automatically save the refreshed session to the provided snapshot name.
- Support the headless flow with `codex-auth login <name> --device-auth`.
- Document the combined login + save workflow in `codex-account-switcher/README.md`.

## Impact

- One command captures refreshed tokens into codex-auth snapshots.
- Reduces operator mistakes in multi-account workflows.
- No change to existing `save`, `use`, `list`, or `current` semantics.
