from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from app.tools.codex_auth_multi_runtime import (
    MultiRuntimeToolError,
    activate_runtime_snapshot,
    build_runtime_env,
    build_runtime_paths,
    format_env_exports,
    read_runtime_current,
    run_command_in_runtime,
)

pytestmark = pytest.mark.unit


def test_build_runtime_paths_normalizes_runtime_name(tmp_path: Path) -> None:
    accounts_dir = tmp_path / "accounts"
    runtime_root = tmp_path / "runtimes"
    paths = build_runtime_paths(
        "terminal-a.json",
        runtime_root=runtime_root,
        accounts_dir=accounts_dir,
    )

    assert paths.runtime_name == "terminal-a"
    assert paths.runtime_dir == runtime_root / "terminal-a"
    assert paths.accounts_dir == accounts_dir
    assert paths.current_path == runtime_root / "terminal-a" / "current"
    assert paths.auth_path == runtime_root / "terminal-a" / "auth.json"


def test_activate_runtime_snapshot_updates_runtime_pointers(tmp_path: Path) -> None:
    accounts_dir = tmp_path / "accounts"
    accounts_dir.mkdir(parents=True)
    snapshot = accounts_dir / "work.json"
    snapshot.write_text('{"tokens":{"accessToken":"abc"}}', encoding="utf-8")

    paths = build_runtime_paths("terminal-a", runtime_root=tmp_path / "runtimes", accounts_dir=accounts_dir)
    selected = activate_runtime_snapshot(paths, "work")

    assert selected == snapshot
    assert read_runtime_current(paths) == "work"
    assert paths.auth_path.exists()
    if paths.auth_path.is_symlink():
        assert paths.auth_path.resolve() == snapshot.resolve()
    else:
        assert paths.auth_path.read_bytes() == snapshot.read_bytes()


def test_activate_runtime_snapshot_raises_when_snapshot_missing(tmp_path: Path) -> None:
    paths = build_runtime_paths(
        "terminal-a",
        runtime_root=tmp_path / "runtimes",
        accounts_dir=tmp_path / "accounts",
    )

    with pytest.raises(MultiRuntimeToolError, match="Run `codex-auth save <name>` first"):
        activate_runtime_snapshot(paths, "missing")


def test_run_command_in_runtime_passes_runtime_env(tmp_path: Path) -> None:
    accounts_dir = tmp_path / "accounts"
    runtime_root = tmp_path / "runtimes"
    paths = build_runtime_paths("terminal-a", runtime_root=runtime_root, accounts_dir=accounts_dir)

    output_file = tmp_path / "env.json"
    command = [
        sys.executable,
        "-c",
        (
            "import json, os, sys; "
            "json.dump({k: os.environ.get(k) for k in "
            "['CODEX_AUTH_ACCOUNTS_DIR','CODEX_AUTH_CURRENT_PATH','CODEX_AUTH_JSON_PATH']}, "
            "open(sys.argv[1], 'w', encoding='utf-8'))"
        ),
        str(output_file),
    ]
    return_code = run_command_in_runtime(paths, command)
    assert return_code == 0

    payload = json.loads(output_file.read_text(encoding="utf-8"))
    assert payload == build_runtime_env(paths)


def test_format_env_exports_outputs_shell_exports(tmp_path: Path) -> None:
    paths = build_runtime_paths(
        "terminal-a",
        runtime_root=tmp_path / "runtimes",
        accounts_dir=tmp_path / "accounts",
    )
    rendered = format_env_exports(build_runtime_env(paths))
    assert "export CODEX_AUTH_ACCOUNTS_DIR=" in rendered
    assert "export CODEX_AUTH_CURRENT_PATH=" in rendered
    assert "export CODEX_AUTH_JSON_PATH=" in rendered
