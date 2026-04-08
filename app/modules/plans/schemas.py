from __future__ import annotations

from datetime import datetime

from app.modules.shared.schemas import DashboardModel


class PlanRoleProgress(DashboardModel):
    role: str
    total_checkpoints: int
    done_checkpoints: int


class PlanOverallProgress(DashboardModel):
    total_checkpoints: int
    done_checkpoints: int
    percent_complete: int


class PlanCheckpoint(DashboardModel):
    timestamp: str
    role: str
    checkpoint_id: str
    state: str
    message: str


class OpenSpecPlanSummary(DashboardModel):
    slug: str
    title: str
    status: str
    updated_at: datetime
    roles: list[PlanRoleProgress]
    overall_progress: PlanOverallProgress
    current_checkpoint: PlanCheckpoint | None


class OpenSpecPlansResponse(DashboardModel):
    entries: list[OpenSpecPlanSummary]


class OpenSpecPlanRoleDetail(DashboardModel):
    role: str
    total_checkpoints: int
    done_checkpoints: int
    tasks_markdown: str
    checkpoints_markdown: str | None


class OpenSpecPlanDetail(DashboardModel):
    slug: str
    title: str
    status: str
    updated_at: datetime
    summary_markdown: str
    checkpoints_markdown: str
    roles: list[OpenSpecPlanRoleDetail]
    overall_progress: PlanOverallProgress
    current_checkpoint: PlanCheckpoint | None
