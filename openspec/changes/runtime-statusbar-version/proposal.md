## Why

The footer version badge can become stale (for example after version bumps without restarting the dev server or when a previously compiled bundle is still open). Operators then see an older version than the current frontend package version.

## What Changes

- Add runtime version resolution for the footer version badge.
- Prefer runtime-readable version sources (`/package.json` in dev, `/version.json` in built assets).
- Keep the compile-time `__APP_VERSION__` as fallback only.
- Emit a `version.json` asset during frontend build so production bundles expose an explicit runtime version payload.

## Impact

- Footer version reflects the current runtime artifact more reliably.
- Version mismatches are less confusing during deploy/dev loops.
