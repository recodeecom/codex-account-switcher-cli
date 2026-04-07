from __future__ import annotations

from fastapi import APIRouter, Body, Depends

from app.core.auth.dependencies import set_dashboard_error_format, validate_dashboard_session
from app.core.exceptions import DashboardBadRequestError
from app.dependencies import BillingContext, get_billing_context
from app.modules.billing.repository import BillingAccountRecord, BillingMemberRecord
from app.modules.billing.schemas import (
    BillingAccount,
    BillingAccountsResponse,
    BillingAccountsUpdateRequest,
    BillingCycle,
    BillingMember,
)

router = APIRouter(
    prefix="/api/billing",
    tags=["dashboard"],
    dependencies=[Depends(validate_dashboard_session), Depends(set_dashboard_error_format)],
)


@router.get("", response_model=BillingAccountsResponse)
async def get_billing_accounts(
    context: BillingContext = Depends(get_billing_context),
) -> BillingAccountsResponse:
    payload = await context.service.get_accounts()
    return BillingAccountsResponse(accounts=[_to_schema(account) for account in payload.accounts])


@router.put("", response_model=BillingAccountsResponse)
async def update_billing_accounts(
    payload: BillingAccountsUpdateRequest = Body(...),
    context: BillingContext = Depends(get_billing_context),
) -> BillingAccountsResponse:
    records = [_to_record(account) for account in payload.accounts]
    try:
        updated = await context.service.replace_accounts(records)
    except ValueError as exc:
        raise DashboardBadRequestError(str(exc), code="invalid_billing_payload") from exc
    return BillingAccountsResponse(accounts=[_to_schema(account) for account in updated.accounts])


def _to_schema(account: BillingAccountRecord) -> BillingAccount:
    return BillingAccount(
        id=account.id,
        domain=account.domain,
        billing_cycle=BillingCycle(
            start=account.billing_cycle_start,
            end=account.billing_cycle_end,
        ),
        chatgpt_seats_in_use=account.chatgpt_seats_in_use,
        codex_seats_in_use=account.codex_seats_in_use,
        members=[
            BillingMember(
                id=member.id,
                name=member.name,
                email=member.email,
                role="Owner" if member.role == "Owner" else "Member",
                seat_type="Codex" if member.seat_type == "Codex" else "ChatGPT",
                date_added=member.date_added,
            )
            for member in account.members
        ],
    )


def _to_record(account: BillingAccount) -> BillingAccountRecord:
    return BillingAccountRecord(
        id=account.id,
        domain=account.domain,
        billing_cycle_start=account.billing_cycle.start,
        billing_cycle_end=account.billing_cycle.end,
        chatgpt_seats_in_use=account.chatgpt_seats_in_use,
        codex_seats_in_use=account.codex_seats_in_use,
        members=[
            BillingMemberRecord(
                id=member.id,
                name=member.name,
                email=member.email,
                role=member.role,
                seat_type=member.seat_type,
                date_added=member.date_added,
            )
            for member in account.members
        ],
    )
