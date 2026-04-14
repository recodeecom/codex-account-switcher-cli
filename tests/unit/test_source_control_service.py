from __future__ import annotations

import subprocess
from types import SimpleNamespace
from pathlib import Path

import pytest

import app.modules.source_control.service as source_control_service
from app.modules.source_control.service import (
    SourceControlBotSnapshot,
    SourceControlError,
    SourceControlService,
)

pytestmark = pytest.mark.unit


def _git(repo: Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=str(repo),
        text=True,
        capture_output=True,
        check=True,
    )
    return completed.stdout.strip()


def _init_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir(parents=True, exist_ok=True)
    _git(repo, "init")
    _git(repo, "config", "user.email", "tests@example.com")
    _git(repo, "config", "user.name", "Tests")
    (repo / "README.md").write_text("base\n", encoding="utf-8")
    _git(repo, "add", "README.md")
    _git(repo, "commit", "-m", "Initial commit")
    default_branch = _git(repo, "rev-parse", "--abbrev-ref", "HEAD")
    if default_branch != "main":
        _git(repo, "branch", "-M", "main")
    return repo


def test_build_preview_includes_branch_merge_and_bot_sync(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _git(repo, "checkout", "-b", "agent/master-agent")
    (repo / "feature.txt").write_text("feature\n", encoding="utf-8")
    _git(repo, "add", "feature.txt")
    _git(repo, "commit", "-m", "Add feature from bot")
    _git(repo, "checkout", "main")

    service = SourceControlService()
    preview = service.build_preview(
        project_path=str(repo),
        bots=[SourceControlBotSnapshot(name="Master Agent", status="active", runtime="Codex")],
    )

    assert preview.repository_root == str(repo.resolve())
    assert preview.active_branch == "main"
    assert preview.base_branch == "main"
    assert preview.commit_preview.subject
    assert any(entry.name == "agent/master-agent" for entry in preview.branches)
    assert any(entry.branch == "agent/master-agent" for entry in preview.merge_preview)
    assert any(
        bot.bot_name == "Master Agent" and bot.matched_branch == "agent/master-agent"
        for bot in preview.gx_bots
    )


def test_build_preview_reports_dirty_changed_files(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    (repo / "README.md").write_text("base\nchanged\n", encoding="utf-8")

    service = SourceControlService()
    preview = service.build_preview(project_path=str(repo), bots=[])

    assert preview.dirty is True
    assert any(entry.path == "README.md" for entry in preview.changed_files)


def test_build_preview_rejects_missing_project_path(tmp_path: Path) -> None:
    service = SourceControlService()

    with pytest.raises(SourceControlError, match="Project path does not exist"):
        service.build_preview(project_path=str(tmp_path / "missing"), bots=[])


def test_build_preview_includes_active_snapshot_sessions_with_worktree_branch_mapping(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo = _init_repo(tmp_path)
    snapshot_name = "admin@kozponthiusbolt.hu--dup-2"
    snapshot_branch = "agent/codex/admin-kozponthiusbolt-hu--dup-2"

    _git(repo, "checkout", "-b", snapshot_branch)
    (repo / "snapshot.txt").write_text("snapshot\n", encoding="utf-8")
    _git(repo, "add", "snapshot.txt")
    _git(repo, "commit", "-m", "Add snapshot branch")
    _git(repo, "checkout", "main")

    snapshot_worktree = tmp_path / "snapshot-worktree"
    _git(repo, "worktree", "add", str(snapshot_worktree), snapshot_branch)

    monkeypatch.setattr(
        source_control_service,
        "read_live_codex_process_session_attribution",
        lambda: SimpleNamespace(
            counts_by_snapshot={snapshot_name: 1},
            mapped_session_pids_by_snapshot={snapshot_name: [101]},
        ),
    )
    monkeypatch.setattr(
        source_control_service,
        "read_runtime_live_session_counts_by_snapshot",
        lambda: {snapshot_name: 1},
    )
    monkeypatch.setattr(
        source_control_service,
        "_read_process_cwd",
        lambda pid: snapshot_worktree if pid == 101 else None,
    )

    service = SourceControlService()
    preview = service.build_preview(project_path=str(repo), bots=[])

    matching_entries = [
        entry
        for entry in preview.gx_bots
        if entry.source == "snapshot" and entry.snapshot_name == snapshot_name
    ]
    assert matching_entries
    assert matching_entries[0].matched_branch == snapshot_branch
    assert matching_entries[0].session_count == 1
