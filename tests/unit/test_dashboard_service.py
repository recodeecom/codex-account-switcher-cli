from __future__ import annotations

from app.modules.dashboard.service import _should_overlay_live_task_previews


def test_should_overlay_live_task_previews_returns_false_without_signals() -> None:
    should_overlay = _should_overlay_live_task_previews(
        codex_live_session_counts_by_account={"acc-a": 0},
        codex_tracked_session_counts_by_account={"acc-a": 0},
        codex_current_task_preview_by_account={},
        codex_session_task_previews_by_account={"acc-a": []},
    )

    assert should_overlay is False


def test_should_overlay_live_task_previews_returns_true_when_live_session_exists() -> None:
    should_overlay = _should_overlay_live_task_previews(
        codex_live_session_counts_by_account={"acc-a": 1},
        codex_tracked_session_counts_by_account={"acc-a": 0},
        codex_current_task_preview_by_account={},
        codex_session_task_previews_by_account={"acc-a": []},
    )

    assert should_overlay is True


def test_should_overlay_live_task_previews_returns_true_when_task_preview_exists() -> None:
    should_overlay = _should_overlay_live_task_previews(
        codex_live_session_counts_by_account={"acc-a": 0},
        codex_tracked_session_counts_by_account={"acc-a": 0},
        codex_current_task_preview_by_account={"acc-a": "Waiting for new task"},
        codex_session_task_previews_by_account={"acc-a": []},
    )

    assert should_overlay is True
