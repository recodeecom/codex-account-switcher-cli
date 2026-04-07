from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.modules.shared.schemas import DashboardModel


class BillingMember(DashboardModel):
    id: str
    name: str
    email: str
    role: Literal["Owner", "Member"]
    seat_type: Literal["ChatGPT", "Codex"]
    date_added: str


class BillingCycle(DashboardModel):
    start: datetime
    end: datetime


class BillingAccount(DashboardModel):
    id: str
    domain: str
    billing_cycle: BillingCycle
    chatgpt_seats_in_use: int = Field(ge=0)
    codex_seats_in_use: int = Field(ge=0)
    members: list[BillingMember]


class BillingAccountsResponse(DashboardModel):
    accounts: list[BillingAccount]


class BillingAccountsUpdateRequest(DashboardModel):
    accounts: list[BillingAccount]
