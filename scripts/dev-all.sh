#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
MEDUSA_BACKEND_DIR="$ROOT_DIR/apps/backend"
MEDUSA_LOCK_FILE="$MEDUSA_BACKEND_DIR/.medusa/dev-singleton.lock"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[dev-all] Missing required command: $cmd" >&2
    exit 1
  fi
}

require_cmd bun

frontend_pid=""
medusa_pid=""
started_medusa="false"

is_pid_alive() {
  local pid="$1"
  [[ -n "$pid" ]] || return 1
  [[ "$pid" -gt 1 ]] 2>/dev/null || return 1
  kill -0 "$pid" 2>/dev/null
}

read_medusa_launcher_pid() {
  if [[ ! -f "$MEDUSA_LOCK_FILE" ]]; then
    return 1
  fi
  python3 - "$MEDUSA_LOCK_FILE" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
try:
    payload = json.loads(path.read_text(encoding="utf-8"))
except Exception:
    print("")
    raise SystemExit(0)

pid = payload.get("pid")
if isinstance(pid, int) and pid > 0:
    print(pid)
else:
    print("")
PY
}

stop_pid_tree() {
  local pid="$1"
  [[ -n "$pid" ]] || return 0
  [[ "$pid" -gt 1 ]] 2>/dev/null || return 0
  kill -0 "$pid" 2>/dev/null || return 0

  local children
  children="$(ps -eo pid=,ppid= 2>/dev/null | awk -v target="$pid" '$2 == target { print $1 }')"
  for child in $children; do
    stop_pid_tree "$child"
  done

  kill "$pid" 2>/dev/null || true
  sleep 0.2
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  set +e
  if [[ -n "$frontend_pid" ]]; then
    stop_pid_tree "$frontend_pid"
  fi
  if [[ -n "$medusa_pid" && "$started_medusa" == "true" ]]; then
    stop_pid_tree "$medusa_pid"
  fi
}

trap cleanup EXIT INT TERM

reuse_medusa="${DEV_ALL_REUSE_MEDUSA:-true}"
if [[ "$reuse_medusa" =~ ^(1|true|yes|on)$ ]]; then
  existing_medusa_pid="$(read_medusa_launcher_pid || true)"
else
  existing_medusa_pid=""
fi

if [[ -n "$existing_medusa_pid" ]] && is_pid_alive "$existing_medusa_pid"; then
  echo "[dev-all] Reusing existing Medusa backend launcher (pid ${existing_medusa_pid})."
else
  echo "[dev-all] Starting Medusa backend (apps/backend, default :9000)"
  (
    cd "$MEDUSA_BACKEND_DIR"
    exec bun run dev
  ) &
  medusa_pid="$!"
  started_medusa="true"
fi

echo "[dev-all] Starting frontend + Python proxy app (apps/frontend + app backend on :2455)"
(
  cd "$FRONTEND_DIR"
  exec bun run dev:fullstack
) &
frontend_pid="$!"

set +e
if [[ -n "$medusa_pid" ]]; then
  wait -n "$frontend_pid" "$medusa_pid"
  exit_code=$?
else
  wait "$frontend_pid"
  exit_code=$?
fi
set -e

echo "[dev-all] One process exited. Shutting down remaining services..."
exit "$exit_code"
