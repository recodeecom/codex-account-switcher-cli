from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.auth.dependencies import set_dashboard_error_format, validate_dashboard_session
from app.core.exceptions import DashboardNotFoundError, DashboardServiceUnavailableError
from app.modules.plans.schemas import (
    OpenSpecPlanDetail,
    OpenSpecPlansResponse,
    OpenSpecPlanRoleDetail,
    OpenSpecPlanSummary,
    PlanRoleProgress,
)
from app.modules.plans.service import OpenSpecPlansError, OpenSpecPlansService

router = APIRouter(
    prefix="/api/projects/plans",
    tags=["dashboard"],
    dependencies=[Depends(validate_dashboard_session), Depends(set_dashboard_error_format)],
)


def get_plans_service() -> OpenSpecPlansService:
    return OpenSpecPlansService()


@router.get("", response_model=OpenSpecPlansResponse)
async def list_open_spec_plans(
    service: OpenSpecPlansService = Depends(get_plans_service),
) -> OpenSpecPlansResponse:
    try:
        entries = service.list_plans()
    except OpenSpecPlansError as exc:
        raise DashboardServiceUnavailableError(
            "Unable to read OpenSpec plans",
            code="plans_unavailable",
        ) from exc

    return OpenSpecPlansResponse(
        entries=[
            OpenSpecPlanSummary(
                slug=entry.slug,
                title=entry.title,
                status=entry.status,
                updated_at=entry.updated_at,
                roles=[
                    PlanRoleProgress(
                        role=role.role,
                        total_checkpoints=role.total_checkpoints,
                        done_checkpoints=role.done_checkpoints,
                    )
                    for role in entry.roles
                ],
            )
            for entry in entries
        ]
    )


@router.get("/{plan_slug}", response_model=OpenSpecPlanDetail)
async def get_open_spec_plan(
    plan_slug: str,
    service: OpenSpecPlansService = Depends(get_plans_service),
) -> OpenSpecPlanDetail:
    try:
        detail = service.get_plan(plan_slug)
    except OpenSpecPlansError as exc:
        raise DashboardServiceUnavailableError(
            "Unable to read OpenSpec plan",
            code="plans_unavailable",
        ) from exc

    if detail is None:
        raise DashboardNotFoundError("Plan not found", code="plan_not_found")

    return OpenSpecPlanDetail(
        slug=detail.slug,
        title=detail.title,
        status=detail.status,
        updated_at=detail.updated_at,
        summary_markdown=detail.summary_markdown,
        checkpoints_markdown=detail.checkpoints_markdown,
        roles=[
            OpenSpecPlanRoleDetail(
                role=role.role,
                total_checkpoints=role.total_checkpoints,
                done_checkpoints=role.done_checkpoints,
                tasks_markdown=role.tasks_markdown,
                checkpoints_markdown=role.checkpoints_markdown,
            )
            for role in detail.roles
        ],
    )
