## Why

`GET /live_usage` already remaps aliased snapshot names to the selected snapshot name for live session counts and task previews.

However, `account_emails` metadata can still remain keyed by the alias snapshot name. This can split one logical snapshot into two XML rows (one for sessions, one for emails), which makes per-account snapshot/email attribution look incorrect.

## What Changes

- Remap `account_emails` by the same alias map used for session counts and task previews in `/live_usage`.
- Merge/dedupe remapped emails when multiple alias keys converge to one selected snapshot name.
- Keep email normalization stable (trim + lowercase) before emitting XML attributes.
- Add unit coverage proving alias-only email metadata is emitted under the selected snapshot row.
- Treat raw `<live_usage ...>` / `<live_usage_mapping ...>` payload echoes as non-task noise so they do not override per-session task mapping in multi-account feeds.

## Impact

- `/live_usage` presents one coherent row per effective snapshot.
- Session counts and account email metadata stay aligned for troubleshooting.
- Session rows no longer expose self-referential live-usage XML payloads as task previews.
- No API shape changes; only mapping correctness is improved.
