## 1. Spec

- [x] 1.1 Define the README requirement for showing account-name-first `codex-auth list` output

## 2. Tests

- [x] 2.1 Re-run package verification after the documentation change

## 3. Implementation

- [x] 3.1 Add a short `codex-auth list` output example to `README.md`
- [x] 3.2 Clarify that the active row is marked with `*`

## 4. Checkpoints

- [x] 4.1 Confirm package tests still pass

## 5. Cleanup

- [x] 5.1 Validate the change with `openspec validate agent-codex-document-codex-auth-list-output-2026-04-23-12-55 --type change --strict`
- [x] 5.2 Finished with `gx branch finish --branch "agent/codex/document-codex-auth-list-output-2026-04-23-12-55" --base main --via-pr --wait-for-merge --cleanup`
- [x] 5.3 PR `#13` `https://github.com/recodeee/codex-account-switcher-cli/pull/13` is `MERGED` at `2026-04-23T10:57:41Z`; `git worktree list` shows only `/home/deadpool/Documents/recodee/codex-account-switcher` on `main`
