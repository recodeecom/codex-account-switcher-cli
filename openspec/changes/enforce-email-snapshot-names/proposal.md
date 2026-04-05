## Why
Operators are seeing misleading account/snapshot links because legacy snapshot names (for example `cica`, `korona`, `work`) drift from the actual email identity embedded in auth payloads.

## What Changes
- Treat normalized email (for example `user@example.com`) as the canonical snapshot name.
- Make auth auto-import converge legacy aliases to canonical email snapshot names.
- Make `codex-auth login` / `codex-auth save` inferred naming use email-shaped names.
- Preserve non-destructive behavior for collisions by using deterministic duplicate suffixes (`--dup-N`).

## Impact
- Snapshot names are audit-friendly and identity-aligned.
- Dashboard expected snapshot names match what operators see on disk.
- New login/save flows no longer require manual naming to get email-shaped snapshots.
