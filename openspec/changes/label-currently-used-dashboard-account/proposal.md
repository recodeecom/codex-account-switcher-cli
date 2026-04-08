## Why
Dashboard account cards keep showing `Use this account` even when the rendered account is already the local snapshot in use or is actively working right now. That reads like a pending action instead of current state.

## What Changes
- Update the dashboard account-card primary CTA label to read `Currently used` when the card represents the active local snapshot or a working-now account.
- Keep the existing enabled/disabled gating and success styling unchanged.
- Add regression coverage for active-snapshot, working-now, and pending-switch button labels.

## Impact
- Makes dashboard account cards communicate current-use state more clearly.
- Avoids implying that users still need to switch to an account that is already in use.
