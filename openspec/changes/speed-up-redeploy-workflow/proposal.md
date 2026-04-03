## Why
`./redeploy.sh` is currently slower than necessary for normal local iteration because it always performs two expensive steps:

1. global `codex-auth` reinstall from `./codex-account-switcher`
2. frontend patch-version bump in `frontend/package.json`

For unchanged code, both actions add avoidable latency and force extra rebuild/cache churn.

## What Changes
- Make bundled `codex-auth` install/update conditional by default:
  - install when missing
  - install when local package version differs from installed CLI version
  - install when local package fingerprint changed since the last successful install
  - force install when `--force-codex-auth-install` is passed
- Keep explicit opt-out via `--skip-codex-auth-install` and `CODEX_LB_INSTALL_CODEX_AUTH=false`.
- Stop auto-bumping `frontend/package.json` on every redeploy by default.
- Add explicit opt-in bump controls:
  - `--bump-frontend-version`
  - `CODEX_LB_BUMP_FRONTEND_VERSION=true`
- Update README redeploy guidance.

## Expected Outcome
- Repeat redeploy runs on unchanged trees complete faster.
- Operators keep deterministic control when they want forced reinstalls or explicit version bumps.
