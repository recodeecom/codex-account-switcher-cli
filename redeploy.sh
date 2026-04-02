#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="turbo"
TARGET_SERVICES=("server" "frontend")

usage() {
  cat <<'EOF'
Usage: ./redeploy.sh [--turbo|--full] [service...]

Modes:
  --turbo  Build in parallel and restart only selected services (default, faster)
  --full   Bring stack down and recreate everything (slower, clean reset)

Examples:
  ./redeploy.sh
  ./redeploy.sh --turbo server frontend
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

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose is not available." >&2
  exit 1
fi

PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3 || command -v python)"
fi

if [[ -z "${PYTHON_BIN:-}" ]]; then
  echo "Error: python is required to bump frontend/package.json version." >&2
  exit 1
fi

NEW_VERSION="$("$PYTHON_BIN" - <<'PY'
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
)"

echo "Bumped frontend version to ${NEW_VERSION}"
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
