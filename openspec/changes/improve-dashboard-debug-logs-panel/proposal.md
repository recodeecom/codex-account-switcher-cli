## Why
Account-card debug logs are currently compact and hard to read during live troubleshooting.  
Operators need larger, clearer log output, explicit logic-flow lines, and fast copy-to-clipboard so they can share diagnostics.

## What Changes
- Redesign the account-card debug panel for readability:
  - larger text
  - larger log viewport with scrolling
  - clearer visual contrast
- Add structured logic-flow lines in the debug payload (merged values, override reason, flow stage, snapshots).
- Add a `Copy logs` action that copies the full expanded debug log text.

## Impact
- Faster troubleshooting directly from dashboard account cards.
- Easier sharing of exact diagnostic context without manual transcription.
