#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="turbo"
TARGET_SERVICES=("server" "frontend")
INSTALL_CODEX_AUTH="${CODEX_LB_INSTALL_CODEX_AUTH:-true}"
BUMP_FRONTEND_VERSION="${CODEX_LB_BUMP_FRONTEND_VERSION:-false}"
FORCE_CODEX_AUTH_INSTALL="false"

usage() {
  cat <<'EOF'
Usage: ./redeploy.sh [--turbo|--full] [--skip-codex-auth-install] [--force-codex-auth-install] [--bump-frontend-version] [service...]

Modes:
  --turbo  Build in parallel and restart only selected services (default, faster)
  --full   Bring stack down and recreate everything (slower, clean reset)

Flags:
  --skip-codex-auth-install  Skip global codex-auth install/update step
  --force-codex-auth-install Force global codex-auth install/update step
  --bump-frontend-version    Increment frontend/package.json patch version

Env:
  CODEX_LB_INSTALL_CODEX_AUTH=true|false (default: true)
  CODEX_LB_BUMP_FRONTEND_VERSION=true|false (default: false)

Examples:
  ./redeploy.sh
  ./redeploy.sh --turbo server frontend
  ./redeploy.sh --force-codex-auth-install
  ./redeploy.sh --bump-frontend-version
  ./redeploy.sh --skip-codex-auth-install --full
  ./redeploy.sh --full
EOF
}

while (($#)); do
  case "$1" in
    --turbo)
      MODE="turbo"
      shift
      ;;
    --full)
      MODE="full"
      shift
      ;;
    --skip-codex-auth-install)
      INSTALL_CODEX_AUTH="false"
      shift
      ;;
    --force-codex-auth-install)
      FORCE_CODEX_AUTH_INSTALL="true"
      shift
      ;;
    --bump-frontend-version)
      BUMP_FRONTEND_VERSION="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      TARGET_SERVICES=("$@")
      break
      ;;
  esac
done

normalize_bool() {
  local value="${1:-}"
  case "${value,,}" in
    1|true|yes|on) echo "true" ;;
    0|false|no|off) echo "false" ;;
    *)
      echo "Error: expected boolean value, got: ${value}" >&2
      exit 1
      ;;
  esac
}

INSTALL_CODEX_AUTH="$(normalize_bool "$INSTALL_CODEX_AUTH")"
BUMP_FRONTEND_VERSION="$(normalize_bool "$BUMP_FRONTEND_VERSION")"
FORCE_CODEX_AUTH_INSTALL="$(normalize_bool "$FORCE_CODEX_AUTH_INSTALL")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose is not available." >&2
  exit 1
fi

install_codex_auth() {
  local switcher_dir="$ROOT_DIR/codex-account-switcher"
  local state_dir="$ROOT_DIR/.omx/state/redeploy"
  local state_file="$state_dir/codex-auth-switcher.sha256"
  local package_version=""
  local installed_version=""
  local local_fingerprint=""
  local cached_fingerprint=""
  if [[ "$INSTALL_CODEX_AUTH" != "true" ]]; then
    echo "Skipping codex-auth install/update (disabled)."
    return
  fi

  if [[ ! -d "$switcher_dir" ]]; then
    echo "Skipping codex-auth install/update: $switcher_dir not found."
    return
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is required to install codex-auth globally. Install Node/npm or pass --skip-codex-auth-install." >&2
    exit 1
  fi

  package_version="$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$switcher_dir/package.json" | head -n1)"

  if command -v codex-auth >/dev/null 2>&1; then
    installed_version="$(codex-auth --version 2>/dev/null | sed -n 's|^@imdeadpool/codex-account-switcher/\([0-9][0-9.]*\).*|\1|p' | head -n1 || true)"
    if [[ -z "$installed_version" ]]; then
      installed_version="$(codex-auth --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)"
    fi
  fi

  local_fingerprint="$(
    cd "$switcher_dir"
    find . -type f \
      \( -path './src/*' -o -name 'package.json' -o -name 'package-lock.json' -o -name 'tsconfig.json' -o -name 'README.md' -o -name 'LICENSE' \) \
      -print0 \
      | sort -z \
      | xargs -0 -r sha256sum \
      | sha256sum \
      | awk '{print $1}'
  )"

  if [[ -f "$state_file" ]]; then
    cached_fingerprint="$(<"$state_file")"
  fi

  if [[ "$FORCE_CODEX_AUTH_INSTALL" != "true" ]] \
    && [[ -n "$installed_version" ]] \
    && [[ -n "$package_version" ]] \
    && [[ "$installed_version" == "$package_version" ]] \
    && [[ -n "$cached_fingerprint" ]] \
    && [[ "$cached_fingerprint" == "$local_fingerprint" ]]; then
    echo "Skipping codex-auth install/update (already up to date: version ${installed_version})."
    return
  fi

  if [[ "$FORCE_CODEX_AUTH_INSTALL" == "true" ]]; then
    echo "Installing codex-auth globally from local package (forced)..."
  elif [[ -z "$installed_version" ]]; then
    echo "Installing codex-auth globally from local package (not currently installed)..."
  elif [[ "$installed_version" != "$package_version" ]]; then
    echo "Installing codex-auth globally from local package (version mismatch: installed ${installed_version}, local ${package_version})..."
  else
    echo "Installing codex-auth globally from local package (source fingerprint changed)..."
  fi

  (
    set -euo pipefail
    cd "$switcher_dir"
    npm install --silent --no-audit --no-fund
    npm run --silent build
    tarball=""
    tarball="$(npm pack --silent | tail -n1)"
    npm install -g "$tarball" --silent --no-audit --no-fund
    rm -f "$tarball"
  )

  mkdir -p "$state_dir"
  printf '%s\n' "$local_fingerprint" >"$state_file"

  if command -v codex-auth >/dev/null 2>&1; then
    echo "codex-auth install/update complete ($(codex-auth --version 2>/dev/null || echo "version unknown"))."
  else
    echo "Warning: codex-auth install step completed but binary is not on PATH." >&2
  fi
}

install_codex_auth

PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3 || command -v python)"
fi

if [[ -z "${PYTHON_BIN:-}" ]]; then
  echo "Error: python is required to read/bump frontend/package.json version." >&2
  exit 1
fi

read_frontend_version() {
"$PYTHON_BIN" - <<'PY'
import json
from pathlib import Path

package_path = Path("frontend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
version = package.get("version", "0.0.0")
print(version)
PY
}

bump_frontend_version() {
"$PYTHON_BIN" - <<'PY'
import json
from pathlib import Path

package_path = Path("frontend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
version = package.get("version", "0.0.0")

parts = version.split(".")
if len(parts) != 3 or any(not part.isdigit() for part in parts):
    raise SystemExit(f"Unsupported semver format in frontend/package.json: {version!r}")

major, minor, patch = map(int, parts)
next_version = f"{major}.{minor}.{patch + 1}"
package["version"] = next_version
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")
print(next_version)
PY
}

if [[ "$BUMP_FRONTEND_VERSION" == "true" ]]; then
  NEW_VERSION="$(bump_frontend_version)"
  echo "Bumped frontend version to ${NEW_VERSION}"
else
  NEW_VERSION="$(read_frontend_version)"
  echo "Keeping frontend version at ${NEW_VERSION} (auto-bump disabled)."
fi

echo "Redeploying docker compose stack in ${MODE} mode..."

if [[ "$MODE" == "full" ]]; then
  docker compose down
  docker compose up -d --build "${TARGET_SERVICES[@]}"
else
  if ! docker compose build --parallel "${TARGET_SERVICES[@]}"; then
    echo "Parallel build failed or not supported, falling back to standard build..."
    docker compose build "${TARGET_SERVICES[@]}"
  fi
  docker compose up -d --no-deps "${TARGET_SERVICES[@]}"
fi

echo "Redeploy complete. Current frontend version: ${NEW_VERSION}"
