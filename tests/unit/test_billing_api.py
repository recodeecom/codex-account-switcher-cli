from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest

from app.dependencies import BillingContext, get_billing_context
from app.modules.billing.service import (
    BillingAccountData,
    BillingAccountsData,
    BillingCycleData,
    BillingMemberData,
    BillingSummaryUnavailableError,
)


def _billing_account(*, entitled: bool = True, subscription_status: str = "active") -> BillingAccountData:
    return BillingAccountData(
        id="business-plan-edixai",
        domain="edixai.com",
        plan_code="business",
        plan_name="Business",
        subscription_status=subscription_status,
        entitled=entitled,
        payment_status="paid",
        billing_cycle=BillingCycleData(
            start=datetime(2026, 3, 23, tzinfo=UTC),
            end=datetime(2026, 4, 23, tzinfo=UTC),
        ),
        renewal_at=datetime(2026, 4, 23, tzinfo=UTC),
        chatgpt_seats_in_use=5,
        codex_seats_in_use=5,
        members=[
            BillingMemberData(
                id="member-edixai-owner",
                name="Edix.ai (You)",
                email="admin@edixai.com",
                role="Owner",
                seat_type="ChatGPT",
                date_added="2026-03-23T00:00:00.000Z",
            )
        ],
    )


def _context(*, get_accounts: AsyncMock | None = None, replace_accounts: AsyncMock | None = None) -> BillingContext:
    service = SimpleNamespace(
        get_accounts=get_accounts or AsyncMock(),
        replace_accounts=replace_accounts or AsyncMock(),
    )
    return cast(
        BillingContext,
        SimpleNamespace(
            session=object(),
            repository=object(),
            service=service,
        ),
    )


@pytest.mark.asyncio
async def test_get_billing_accounts_returns_live_subscription_fields(async_client, app_instance) -> None:
    context = _context(
        get_accounts=AsyncMock(return_value=BillingAccountsData(accounts=[_billing_account()])),
    )
    app_instance.dependency_overrides[get_billing_context] = lambda: context

    try:
        response = await async_client.get("/api/billing")
    finally:
        app_instance.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "accounts": [
            {
                "id": "business-plan-edixai",
                "domain": "edixai.com",
                "planCode": "business",
                "planName": "Business",
                "subscriptionStatus": "active",
                "entitled": True,
                "paymentStatus": "paid",
                "billingCycle": {
                    "start": "2026-03-23T00:00:00Z",
                    "end": "2026-04-23T00:00:00Z",
                },
                "renewalAt": "2026-04-23T00:00:00Z",
                "chatgptSeatsInUse": 5,
                "codexSeatsInUse": 5,
                "members": [
                    {
                        "id": "member-edixai-owner",
                        "name": "Edix.ai (You)",
                        "email": "admin@edixai.com",
                        "role": "Owner",
                        "seatType": "ChatGPT",
                        "dateAdded": "2026-03-23T00:00:00.000Z",
                    }
                ],
            }
        ]
    }


@pytest.mark.asyncio
async def test_get_billing_accounts_returns_503_when_medusa_summary_is_unavailable(
    async_client,
    app_instance,
) -> None:
    context = _context(
        get_accounts=AsyncMock(
            side_effect=BillingSummaryUnavailableError("Medusa billing summary is unavailable")
        ),
    )
    app_instance.dependency_overrides[get_billing_context] = lambda: context

    try:
        response = await async_client.get("/api/billing")
    finally:
        app_instance.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "billing_summary_unavailable",
            "message": "Medusa billing summary is unavailable",
        }
    }


@pytest.mark.asyncio
async def test_update_billing_accounts_rejects_python_bulk_replace(async_client) -> None:
    response = await async_client.put("/api/billing", json={"accounts": []})

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "billing_mutations_unavailable",
            "message": "Billing mutations must be applied through Medusa workflows",
        }
    }
