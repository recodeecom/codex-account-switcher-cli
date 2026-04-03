from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
REDEPLOY_SCRIPT = REPO_ROOT / "redeploy.sh"


def _write_executable(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def _create_stub_project(tmp_path: Path) -> Path:
    project = tmp_path / "project"
    project.mkdir()

    shutil.copy2(REDEPLOY_SCRIPT, project / "redeploy.sh")
    (project / "redeploy.sh").chmod((project / "redeploy.sh").stat().st_mode | stat.S_IXUSR)

    frontend = project / "frontend"
    frontend.mkdir()
    (frontend / "package.json").write_text(
        json.dumps(
            {
                "name": "frontend",
                "private": True,
                "version": "1.0.0",
                "scripts": {"redeploy": "bash ../redeploy.sh"},
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    switcher = project / "codex-account-switcher"
    (switcher / "src").mkdir(parents=True)
    (switcher / "package.json").write_text(
        json.dumps({"name": "@imdeadpool/codex-account-switcher", "version": "0.1.0"}, indent=2) + "\n",
        encoding="utf-8",
    )
    (switcher / "package-lock.json").write_text("{}\n", encoding="utf-8")
    (switcher / "tsconfig.json").write_text("{}\n", encoding="utf-8")
    (switcher / "src" / "index.ts").write_text("export const x = 1;\n", encoding="utf-8")
    (switcher / "README.md").write_text("switcher\n", encoding="utf-8")
    (switcher / "LICENSE").write_text("MIT\n", encoding="utf-8")

    stubs = project / "stubs"
    stubs.mkdir()
    logs = project / "logs"
    logs.mkdir()

    _write_executable(
        stubs / "docker",
        """#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "compose" && "${2:-}" == "version" ]]; then
  exit 0
fi
echo "docker $*" >>"${DOCKER_LOG}"
exit 0
""",
    )

    _write_executable(
        stubs / "npm",
        """#!/usr/bin/env bash
set -euo pipefail
echo "$*" >>"${NPM_LOG}"
if [[ "${1:-}" == "pack" ]]; then
  TAR_NAME="codex-account-switcher-0.1.0.tgz"
  touch "${TAR_NAME}"
  echo "${TAR_NAME}"
fi
exit 0
""",
    )

    _write_executable(
        stubs / "codex-auth",
        """#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "--version" ]]; then
  VERSION="${CODEX_AUTH_VERSION:-0.1.0}"
  echo "@imdeadpool/codex-account-switcher/${VERSION} linux-x64 node-v22.0.0"
  exit 0
fi
exit 0
""",
    )

    return project


def _run_redeploy(project: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PATH"] = f"{project / 'stubs'}:{env['PATH']}"
    env["HOME"] = str(project / "home")
    env["NPM_LOG"] = str(project / "logs" / "npm.log")
    env["DOCKER_LOG"] = str(project / "logs" / "docker.log")
    env["CODEX_AUTH_VERSION"] = "0.1.0"
    (project / "home").mkdir(exist_ok=True)

    result = subprocess.run(
        ["bash", "./redeploy.sh", *args],
        cwd=project,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(
            f"redeploy failed ({result.returncode})\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    return result


def _frontend_version(project: Path) -> str:
    return json.loads((project / "frontend" / "package.json").read_text(encoding="utf-8"))["version"]


def test_redeploy_skips_codex_auth_when_unchanged(tmp_path: Path) -> None:
    project = _create_stub_project(tmp_path)

    _run_redeploy(project, "--force-codex-auth-install")
    (project / "logs" / "npm.log").write_text("", encoding="utf-8")

    result = _run_redeploy(project)
    npm_log = (project / "logs" / "npm.log").read_text(encoding="utf-8").strip()

    assert "Skipping codex-auth install/update (already up to date" in result.stdout
    assert npm_log == ""
    assert _frontend_version(project) == "1.0.0"


def test_redeploy_bumps_frontend_version_only_with_flag(tmp_path: Path) -> None:
    project = _create_stub_project(tmp_path)

    _run_redeploy(project, "--skip-codex-auth-install", "--bump-frontend-version")

    assert _frontend_version(project) == "1.0.1"


def test_redeploy_reinstalls_codex_auth_when_switcher_changes(tmp_path: Path) -> None:
    project = _create_stub_project(tmp_path)

    _run_redeploy(project, "--force-codex-auth-install")
    (project / "logs" / "npm.log").write_text("", encoding="utf-8")

    switcher_src = project / "codex-account-switcher" / "src" / "index.ts"
    switcher_src.write_text(switcher_src.read_text(encoding="utf-8") + "export const y = 2;\n", encoding="utf-8")

    _run_redeploy(project)
    npm_log = (project / "logs" / "npm.log").read_text(encoding="utf-8")

    assert "run --silent build" in npm_log
