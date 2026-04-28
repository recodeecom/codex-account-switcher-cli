# Speed up account switching and relogin snapshot sync

## Why

`codex-auth use <account>` should switch accounts immediately, without spending the command budget on external-login reconciliation that is handled by the login hook. When a user relogs in through the official `codex login` flow, the saved snapshot for that Codex account should be refreshed with the new auth bytes instead of returning early or creating an avoidable duplicate.

## What changes

- Make direct account switching use the fast path.
- Preserve and refresh matching saved snapshot names, including aliases, during official relogin sync.
- Update command copy for reused saved account names.
- Add regression coverage for same-identity token refresh, alias preservation, and session fingerprint updates.

## Verification

- `npm test --silent`
- `openspec validate agent-codex-speed-up-codex-account-switch-relogin-sn-2026-04-28-17-46 --strict`
