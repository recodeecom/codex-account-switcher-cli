## Why
Operators cannot quickly tell which `codex-auth` snapshot is linked to each imported account from the Accounts list. When local switching fails, troubleshooting requires guessing or using external CLI commands.

## What Changes
- Show the resolved codex-auth snapshot name in each account list row subtitle next to the account plan label.
- Show an explicit `No snapshot` marker when no snapshot is currently mapped for an account.

## Impact
- Faster diagnosis for local account switch failures.
- No backend API shape changes required because `codexAuth.snapshotName` is already returned.
