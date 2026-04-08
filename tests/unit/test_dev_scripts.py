from __future__ import annotations

import os
import shutil
import stat
import subprocess
import time
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

REPO_ROOT = Path(__file__).resolve().parents[2]
DEV_ALL_SCRIPT = REPO_ROOT / "scripts" / "dev-all.sh"
DEV_LOGS_SCRIPT = REPO_ROOT / "scripts" / "dev-logs.sh"


def _write_executable(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def _read_until(process: subprocess.Popen[str], needle: str, timeout: float = 20.0) -> str:
    deadline = time.time() + timeout
    chunks: list[str] = []
    assert process.stdout is not None

    while time.time() < deadline:
        line = process.stdout.readline()
        if not line:
            if process.poll() is not None:
                raise AssertionError(
                    f"process exited early with {process.returncode}\nOutput:\n{''.join(chunks)}"
                )
            time.sleep(0.05)
            continue
        chunks.append(line)
        if needle in line:
            return "".join(chunks)

    raise AssertionError(f"timed out waiting for {needle!r}\nOutput so far:\n{''.join(chunks)}")


def test_dev_logs_watch_streams_requested_target(tmp_path: Path) -> None:
    log_dir = tmp_path / "logs"
    log_dir.mkdir()
    frontend_log = log_dir / "frontend.log"
    frontend_log.write_text("first line\n", encoding="utf-8")

    env = os.environ.copy()
    env["DEV_LOG_DIR"] = str(log_dir)
    proc = subprocess.Popen(
        ["bash", str(DEV_LOGS_SCRIPT), "-watch", "frontend"],
        cwd=REPO_ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        initial_output = _read_until(proc, "first line")
        assert "frontend ->" in initial_output

        with frontend_log.open("a", encoding="utf-8") as handle:
            handle.write("second line\n")
        watched_output = _read_until(proc, "second line")
        assert "second line" in watched_output
    finally:
        proc.terminate()
        proc.wait(timeout=5)


def test_dev_all_reports_urls_without_streaming_service_noise(tmp_path: Path) -> None:
    project = tmp_path / "project"
    (project / "scripts").mkdir(parents=True)
    (project / "apps" / "backend").mkdir(parents=True)
    (project / "apps" / "frontend" / "scripts").mkdir(parents=True)
    (project / "logs").mkdir()
    (project / "apps" / "backend" / ".medusa").mkdir(parents=True)

    shutil.copy2(DEV_ALL_SCRIPT, project / "scripts" / "dev-all.sh")

    _write_executable(
        project / "scripts" / "run-server-dev.sh",
        """#!/bin/sh
set -eu
port="${APP_BACKEND_PORT:-2455}"
echo "APP NOISY LINE"
echo "[stub] App URL -> http://localhost:${port}"
exec python3 -m http.server "${port}" --bind 127.0.0.1
""",
    )

    _write_executable(
        project / "apps" / "backend" / "dev-stub.sh",
        """#!/usr/bin/env bash
set -euo pipefail
port="${MEDUSA_PORT:-9000}"
echo "BACKEND NOISY LINE"
echo "info:    Admin URL → http://localhost:${port}/app"
exec python3 -m http.server "${port}" --bind 127.0.0.1
""",
    )

    _write_executable(
        project / "apps" / "frontend" / "scripts" / "run-frontend-dev.sh",
        """#!/bin/sh
set -eu
port="${NEXT_DEV_PORT:-5174}"
echo "FRONTEND NOISY LINE"
echo "[codex-lb] Frontend dev server: http://localhost:${port}"
exec python3 -m http.server "${port}" --bind 127.0.0.1
""",
    )

    stubs = project / "stubs"
    stubs.mkdir()
    _write_executable(
        stubs / "bun",
        f"""#!/usr/bin/env bash
set -euo pipefail
if [[ "${{1:-}}" == "run" && "${{2:-}}" == "dev" && "$PWD" == "{project / 'apps' / 'backend'}" ]]; then
  shift 2
  exec bash ./dev-stub.sh "$@"
fi
echo "unsupported bun invocation: $*" >&2
exit 1
""",
    )

    env = os.environ.copy()
    env["PATH"] = f"{stubs}:{env['PATH']}"
    env["APP_BACKEND_PORT"] = "32455"
    env["MEDUSA_BACKEND_PORT"] = "39000"
    env["FRONTEND_PORT"] = "35174"

    proc = subprocess.Popen(
        ["bash", "./scripts/dev-all.sh"],
        cwd=project,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        output = _read_until(proc, "[dev] Ready")
        output += _read_until(proc, "bun run logs -watch frontend")

        assert "http://localhost:32455" in output
        assert "http://localhost:39000/app" in output
        assert "http://localhost:35174" in output
        assert "APP NOISY LINE" not in output
        assert "BACKEND NOISY LINE" not in output
        assert "FRONTEND NOISY LINE" not in output

        assert "APP NOISY LINE" in (project / "logs" / "server.log").read_text(encoding="utf-8")
        assert "BACKEND NOISY LINE" in (project / "logs" / "backend.log").read_text(encoding="utf-8")
        assert "FRONTEND NOISY LINE" in (project / "logs" / "frontend.log").read_text(encoding="utf-8")
    finally:
        proc.terminate()
        proc.wait(timeout=5)
