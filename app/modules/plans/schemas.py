from __future__ import annotations

from datetime import datetime

from app.modules.shared.schemas import DashboardModel


class PlanRoleProgress(DashboardModel):
    role: str
    total_checkpoints: int
    done_checkpoints: int


class OpenSpecPlanSummary(DashboardModel):
    slug: str
    title: str
    status: str
    updated_at: datetime
    roles: list[PlanRoleProgress]


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
