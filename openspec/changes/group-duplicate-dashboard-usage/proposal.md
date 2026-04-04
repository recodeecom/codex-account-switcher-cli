## Why
When the same Codex account is active in multiple CLI sessions, the dashboard can list duplicate account identities (same email) with different internal account IDs.  
The top usage donuts currently treat these rows independently, which can double-count capacity and show duplicated legend rows for one real account.

## What Changes
- Group duplicate dashboard usage entries by account identity (email/display fallback) for donut rendering in both:
  - remaining-capacity donuts
  - request-log consumed-usage donuts
- Keep account cards unchanged so concurrent sessions remain visible in **Working now**.
- For grouped donut usage, choose the lowest remaining quota among duplicates (the most constrained/latest effective value).
- For grouped consumed-usage donuts, combine duplicate identity usage into one identity row.
- Recompute donut totals from grouped capacity so center totals stay consistent with grouped slices.

## Impact
- Usage donuts no longer overstate capacity for duplicated account identities.
- Operators still see multiple live cards/sessions for the same account.
- Quota visualization becomes conservative and consistent when duplicate identities exist.
