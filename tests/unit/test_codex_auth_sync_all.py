from __future__ import annotations

from pathlib import Path

import pytest

from app.tools.codex_auth_switch import SwitchToolError
from app.tools.codex_auth_sync_all import _iter_snapshot_files, _resolve_accounts_dir

pytestmark = pytest.mark.unit


def test_iter_snapshot_files_returns_sorted_json_files(tmp_path: Path) -> None:
    accounts_dir = tmp_path / "accounts"
    accounts_dir.mkdir()

    (accounts_dir / "zeta.json").write_text("{}")
    (accounts_dir / "alpha.json").write_text("{}")
    (accounts_dir / "notes.txt").write_text("ignore")

    snapshots = _iter_snapshot_files(accounts_dir)

    assert [p.name for p in snapshots] == ["alpha.json", "zeta.json"]


def test_iter_snapshot_files_raises_when_directory_missing(tmp_path: Path) -> None:
    missing = tmp_path / "missing"
    with pytest.raises(SwitchToolError):
        _iter_snapshot_files(missing)


def test_resolve_accounts_dir_expands_user_path() -> None:
    resolved = _resolve_accounts_dir("~/.codex/accounts")
    assert resolved == (Path.home() / ".codex" / "accounts").resolve()
