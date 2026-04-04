## Why

Some accounts start active Codex CLI sessions but remain outside Dashboard `Working now` until `codexAuth.hasLiveSession` or session counters catch up. In mixed deferred-session mode, this creates a noticeable delay even when a fresh current-task preview is already available for the account.

## What Changes

- Treat a fresh non-empty `codexCurrentTaskPreview` as an additional active CLI signal in frontend working detection.
- Keep the existing cascade order and preserve the deferred mixed-session guard for accounts with only raw-sample signals.
- Add regression coverage so deferred mixed-session accounts with task-preview evidence enter `Working now` immediately.

## Impact

- Accounts with newly started CLI sessions appear in `Working now` sooner.
- Existing false-positive protections for raw-sample-only deferred mixed-session accounts remain intact.
