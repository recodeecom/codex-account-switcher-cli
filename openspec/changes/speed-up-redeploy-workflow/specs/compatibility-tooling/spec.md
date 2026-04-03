### ADDED Requirement: Redeploy skips codex-auth reinstall when unchanged
The redeploy workflow SHALL skip the global `codex-auth` install/update step when all of the following are true:

- `codex-auth` is already installed
- installed CLI version matches the bundled `codex-account-switcher` package version
- bundled package fingerprint matches the last successful local install fingerprint
- force reinstall is not requested

#### Scenario: Default redeploy skips codex-auth reinstall when up to date
- **WHEN** an operator runs `./redeploy.sh` with default settings
- **AND** bundled `codex-auth` is already installed and unchanged
- **THEN** redeploy skips npm install/build/pack/install for `codex-auth`

#### Scenario: Force flag reinstalls codex-auth
- **WHEN** an operator runs `./redeploy.sh --force-codex-auth-install`
- **THEN** redeploy performs global `codex-auth` install/update even when unchanged

### ADDED Requirement: Redeploy does not bump frontend version by default
The redeploy workflow SHALL NOT mutate `frontend/package.json` version unless explicit bump controls are enabled.

#### Scenario: Default redeploy keeps frontend version unchanged
- **WHEN** an operator runs `./redeploy.sh` with default settings
- **THEN** redeploy does not modify `frontend/package.json` version

#### Scenario: Explicit bump increments frontend patch version
- **WHEN** an operator runs `./redeploy.sh --bump-frontend-version`
- **OR** sets `CODEX_LB_BUMP_FRONTEND_VERSION=true`
- **THEN** redeploy increments `frontend/package.json` patch version by one
