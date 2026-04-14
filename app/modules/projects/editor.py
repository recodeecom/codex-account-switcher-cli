from __future__ import annotations

import os
import platform
import shlex
import shutil
import subprocess
from pathlib import Path
from typing import Literal


class ProjectEditorLaunchError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        code: Literal[
            "invalid_project_path",
            "project_path_not_found",
            "editor_not_found",
            "editor_launch_failed",
        ],
    ) -> None:
        self.code = code
        super().__init__(message)


def open_project_folder_in_editor(project_path: str) -> str | None:
    path = Path(project_path).expanduser()
    if not path.is_absolute():
        raise ProjectEditorLaunchError(
            "Project path must be absolute",
            code="invalid_project_path",
        )
    if not path.exists() or not path.is_dir():
        raise ProjectEditorLaunchError(
            "Project folder path was not found on this machine",
            code="project_path_not_found",
        )

    override = os.environ.get("CODEX_LB_PROJECT_EDITOR_COMMAND", "").strip()
    if override:
        try:
            argv = shlex.split(override)
        except ValueError as exc:
            raise ProjectEditorLaunchError(
                f"Invalid CODEX_LB_PROJECT_EDITOR_COMMAND value: {exc}",
                code="editor_launch_failed",
            ) from exc
        if not argv:
            raise ProjectEditorLaunchError(
                "CODEX_LB_PROJECT_EDITOR_COMMAND is empty",
                code="editor_launch_failed",
            )
        executable = _resolve_executable(argv[0])
        if executable is None:
            raise ProjectEditorLaunchError(
                f"Editor command not found in PATH: {argv[0]}",
                code="editor_not_found",
            )
        _spawn_detached([executable, *argv[1:], str(path)])
        return argv[0]

    errors: list[str] = []
    found_any_editor = False
    for candidate in _default_editor_candidates():
        executable = _resolve_executable(candidate[0])
        if executable is None:
            continue
        found_any_editor = True
        try:
            _spawn_detached([executable, *candidate[1:], str(path)])
            return candidate[0]
        except Exception as exc:  # pragma: no cover - platform-specific launch failures
            errors.append(f"{candidate[0]}: {exc}")

    if not found_any_editor:
        raise ProjectEditorLaunchError(
            "No supported editor command found in PATH (tried: code, cursor, code-insiders, codium, zed, windsurf).",
            code="editor_not_found",
        )
    detail = "; ".join(errors) if errors else "Unknown launch error"
    raise ProjectEditorLaunchError(
        f"Failed to launch editor for project folder. {detail}",
        code="editor_launch_failed",
    )


def _default_editor_candidates() -> tuple[tuple[str, ...], ...]:
    system = platform.system().lower()
    if system == "darwin":
        return (
            ("code", "-n"),
            ("cursor", "-n"),
            ("code-insiders", "-n"),
            ("codium", "-n"),
            ("zed",),
            ("windsurf", "-n"),
        )
    if system == "windows":
        return (
            ("code", "-n"),
            ("cursor", "-n"),
            ("code-insiders", "-n"),
            ("codium", "-n"),
            ("zed",),
            ("windsurf", "-n"),
        )
    return (
        ("code", "-n"),
        ("cursor", "-n"),
        ("code-insiders", "-n"),
        ("codium", "-n"),
        ("zed",),
        ("windsurf", "-n"),
    )


def _resolve_executable(name: str) -> str | None:
    if not name:
        return None
    if os.path.isabs(name):
        return name if os.path.exists(name) and os.access(name, os.X_OK) else None
    return shutil.which(name)


def _spawn_detached(argv: list[str]) -> None:
    subprocess.Popen(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
        close_fds=True,
    )
