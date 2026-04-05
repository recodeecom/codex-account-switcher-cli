## Why
Request Logs EUR fallback estimation can be diluted by sparse or zero-cost rows in density source windows. This produces unrealistically low fallback EUR values in the 5h/7d cards and donuts during live fallback periods.

## What Changes
- Clamp fallback density to a minimum baseline floor of **2.5 USD per 1M tokens** (gpt-5.4 standard input rate).
- Keep current density-source priority (window, cross-window aggregate, account request usage), then apply the floor as a guardrail.
- Apply the guardrail to fallback-projected windows only (where request-log totals are empty and live fallback replacement is active).
- Convert live usage fallback units to actual token count when estimating EUR/USD so fallback costs stay aligned with displayed token totals.
- Update fallback hint copy to explain that fallback EUR values are estimated with a minimum-rate guardrail.

## Impact
- No backend/API/schema changes.
- Non-fallback request-log EUR values remain unchanged.
- Fallback EUR values stay deterministic and avoid near-zero underestimation from diluted densities.
