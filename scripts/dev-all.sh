#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
MEDUSA_BACKEND_DIR="$ROOT_DIR/apps/backend"
MEDUSA_LOCK_FILE="$MEDUSA_BACKEND_DIR/.medusa/dev-singleton.lock"
PORT_REGISTRY_FILE="$ROOT_DIR/.dev-ports.json"
LOG_DIR="${DEV_LOG_DIR:-$ROOT_DIR/logs}"
APP_LOG_FILE="${APP_LOG_FILE:-$LOG_DIR/server.log}"
BACKEND_LOG_FILE="${BACKEND_LOG_FILE:-$LOG_DIR/backend.log}"
FRONTEND_LOG_FILE="${FRONTEND_LOG_FILE:-$LOG_DIR/frontend.log}"
APP_PORT="${APP_BACKEND_PORT:-2455}"
DEFAULT_MEDUSA_PORT="${MEDUSA_BACKEND_PORT:-9000}"
DEFAULT_FRONTEND_PORT="${FRONTEND_PORT:-5174}"

app_pid=""
backend_pid=""
frontend_pid=""

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[dev] Missing required command: $cmd" >&2
    exit 1
  fi
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "( sport = :$port )" 2>/dev/null | grep -q LISTEN
    return
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi
  return 1
}

find_pid_on_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1
    return
  fi
  echo ""
}

is_pid_alive() {
  local pid="${1:-}"
  [[ -n "$pid" ]] || return 1
  [[ "$pid" -gt 1 ]] 2>/dev/null || return 1
  kill -0 "$pid" 2>/dev/null
}

spawn_pid_watcher() {
  local target_pid="$1"
  (
    while kill -0 "$target_pid" 2>/dev/null; do
      sleep 1
    done
  ) &
  echo "$!"
}

ensure_log_file() {
  local log_file="$1"
  mkdir -p "$(dirname "$log_file")"
  touch "$log_file"
}

mark_log_session() {
  local label="$1"
  local log_file="$2"
  ensure_log_file "$log_file"
  printf '\n[%s] ==== %s dev session started ====\n' "$(date -Iseconds)" "$label" >>"$log_file"
}

tail_log_on_failure() {
  local label="$1"
  local log_file="$2"
  echo "[dev] ${label} failed to become ready. Recent log output:" >&2
  tail -n 40 "$log_file" >&2 || true
}

wait_for_port() {
  local port="$1"
  local timeout_seconds="$2"
  local label="$3"
  local watched_pid="$4"
  local log_file="$5"
  local attempts=$((timeout_seconds * 5))

  while (( attempts > 0 )); do
    if port_in_use "$port"; then
      return 0
    fi
    if [[ -n "$watched_pid" ]] && ! is_pid_alive "$watched_pid"; then
      tail_log_on_failure "$label" "$log_file"
      exit 1
    fi
    attempts=$((attempts - 1))
    sleep 0.2
  done

  tail_log_on_failure "$label" "$log_file"
  exit 1
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

read_port_registry_value() {
  local key="$1"
  if [[ ! -f "$PORT_REGISTRY_FILE" ]]; then
    return 1
  fi
  python3 - "$PORT_REGISTRY_FILE" "$key" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
key = sys.argv[2]
try:
    payload = json.loads(path.read_text(encoding="utf-8"))
except Exception:
    print("")
    raise SystemExit(0)

value = payload.get(key)
if isinstance(value, int) and value > 0:
    print(value)
else:
    print("")
PY
}

extract_latest_url() {
  local log_file="$1"
  local marker="$2"
  python3 - "$log_file" "$marker" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
marker = sys.argv[2]
if not path.exists():
    raise SystemExit(1)

pattern = re.compile(r"https?://[^\s]+")
latest = ""
for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
    if marker not in line:
        continue
    match = pattern.search(line)
    if match:
        latest = match.group(0)

if latest:
    print(latest)
PY
}

cleanup() {
  set +e
  for pid in "$frontend_pid" "$backend_pid" "$app_pid"; do
    if [[ -n "$pid" ]] && is_pid_alive "$pid"; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
}

trap cleanup EXIT INT TERM

require_cmd bun
require_cmd python3

mkdir -p "$LOG_DIR"

echo "[dev] Quiet mode enabled. Service logs are written to $LOG_DIR"

mark_log_session "app" "$APP_LOG_FILE"
if port_in_use "$APP_PORT"; then
  existing_app_pid="$(find_pid_on_port "$APP_PORT" || true)"
  echo "[dev] Reusing app API on http://localhost:${APP_PORT}"
  if [[ -n "$existing_app_pid" ]] && is_pid_alive "$existing_app_pid"; then
    app_pid="$(spawn_pid_watcher "$existing_app_pid")"
  fi
else
  echo "[dev] Starting app API on http://localhost:${APP_PORT}"
  (
    cd "$ROOT_DIR"
    LOGGING_TO_FILE=false APP_BACKEND_PORT="$APP_PORT" sh ./scripts/run-server-dev.sh
  ) >>"$APP_LOG_FILE" 2>&1 &
  app_pid="$!"
  wait_for_port "$APP_PORT" 20 "app API" "$app_pid" "$APP_LOG_FILE"
fi

medusa_port="$DEFAULT_MEDUSA_PORT"
mark_log_session "backend" "$BACKEND_LOG_FILE"
existing_medusa_pid="$(read_medusa_launcher_pid || true)"
if [[ -n "$existing_medusa_pid" ]] && is_pid_alive "$existing_medusa_pid"; then
  medusa_port="$(read_port_registry_value backend || true)"
  medusa_port="${medusa_port:-$DEFAULT_MEDUSA_PORT}"
  echo "[dev] Reusing commerce backend on http://localhost:${medusa_port}/app"
  backend_pid="$(spawn_pid_watcher "$existing_medusa_pid")"
else
  echo "[dev] Starting commerce backend on http://localhost:${medusa_port}/app"
  (
    cd "$MEDUSA_BACKEND_DIR"
    MEDUSA_PORT="$medusa_port" PORT="$medusa_port" bun run dev
  ) >>"$BACKEND_LOG_FILE" 2>&1 &
  backend_pid="$!"
  wait_for_port "$medusa_port" 35 "commerce backend" "$backend_pid" "$BACKEND_LOG_FILE"
fi

mark_log_session "frontend" "$FRONTEND_LOG_FILE"
echo "[dev] Starting frontend on http://localhost:${DEFAULT_FRONTEND_PORT}"
(
  cd "$FRONTEND_DIR"
  START_APP_BACKEND=false \
  START_MEDUSA_BACKEND=false \
  API_PROXY_TARGET="http://localhost:${APP_PORT}" \
  NEXT_PUBLIC_MEDUSA_BACKEND_URL="http://localhost:${medusa_port}" \
  NEXT_DEV_PORT="$DEFAULT_FRONTEND_PORT" \
  sh ./scripts/run-frontend-dev.sh
) >>"$FRONTEND_LOG_FILE" 2>&1 &
frontend_pid="$!"
wait_for_port "$DEFAULT_FRONTEND_PORT" 30 "frontend" "$frontend_pid" "$FRONTEND_LOG_FILE"

frontend_url="$(extract_latest_url "$FRONTEND_LOG_FILE" "Frontend dev server:" || true)"
frontend_url="${frontend_url:-http://localhost:${DEFAULT_FRONTEND_PORT}}"
app_url="http://localhost:${APP_PORT}"
backend_url="$(extract_latest_url "$BACKEND_LOG_FILE" "Admin URL" || true)"
backend_url="${backend_url:-http://localhost:${medusa_port}/app}"

echo
echo "[dev] Ready"
echo "  app      ${app_url}"
echo "  backend  ${backend_url}"
echo "  frontend ${frontend_url}"
echo
echo "[dev] Watch logs with:"
echo "  bun run logs -watch app"
echo "  bun run logs -watch backend"
echo "  bun run logs -watch frontend"

set +e
wait -n "$app_pid" "$backend_pid" "$frontend_pid"
exit_code=$?
set -e

echo "[dev] One dev process exited. Shutting down helper processes..."
exit "$exit_code"
