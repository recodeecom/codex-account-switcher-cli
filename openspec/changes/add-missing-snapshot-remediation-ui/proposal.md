## Why
When a dashboard account has no matching `codex-auth` snapshot, operators can click **Use this** and receive an error, but the UI does not clearly show remediation steps inline.

## What Changes
- Add a red **No snapshot** warning badge in Accounts list rows when no resolved `codexAuth.snapshotName` exists.
- Add an Accounts detail-panel tutorial that shows the exact terminal steps to create a snapshot:
  - `codex login`
  - `codex-auth save <snapshot-name>`
- Keep existing `Use this` behavior and error routing unchanged.

## Impact
- Faster recovery when local switching fails due to missing snapshots.
- No backend API changes; frontend reuses existing `codexAuth` fields.
