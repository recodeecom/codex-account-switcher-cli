from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BusinessBillingAccount


@dataclass(frozen=True, slots=True)
class BillingMemberRecord:
    id: str
    name: str
    email: str
    role: str
    seat_type: str
    date_added: str


@dataclass(frozen=True, slots=True)
class BillingAccountRecord:
    id: str
    domain: str
    billing_cycle_start: datetime
    billing_cycle_end: datetime
    chatgpt_seats_in_use: int
    codex_seats_in_use: int
    members: list[BillingMemberRecord]


class BillingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_accounts(self) -> list[BillingAccountRecord]:
        result = await self._session.execute(
            select(BusinessBillingAccount).order_by(BusinessBillingAccount.domain.asc())
        )
        rows = list(result.scalars().all())
        return [_to_record(row) for row in rows]

    async def replace_accounts(
        self,
        accounts: Sequence[BillingAccountRecord],
    ) -> list[BillingAccountRecord]:
        await self._session.execute(delete(BusinessBillingAccount))
        for account in accounts:
            self._session.add(
                BusinessBillingAccount(
                    id=account.id,
                    domain=account.domain,
                    billing_cycle_start=account.billing_cycle_start,
                    billing_cycle_end=account.billing_cycle_end,
                    chatgpt_seats_in_use=account.chatgpt_seats_in_use,
                    codex_seats_in_use=account.codex_seats_in_use,
                    members_json=json.dumps(
                        [_member_to_json(member) for member in account.members],
                        ensure_ascii=False,
                        separators=(",", ":"),
                    ),
                )
            )
        await self._session.commit()
        return await self.list_accounts()


def _member_to_json(member: BillingMemberRecord) -> dict[str, str]:
    return {
        "id": member.id,
        "name": member.name,
        "email": member.email,
        "role": member.role,
        "seatType": member.seat_type,
        "dateAdded": member.date_added,
    }


def _to_record(row: BusinessBillingAccount) -> BillingAccountRecord:
    members = _parse_members(row.members_json)
    return BillingAccountRecord(
        id=row.id,
        domain=row.domain,
        billing_cycle_start=row.billing_cycle_start,
        billing_cycle_end=row.billing_cycle_end,
        chatgpt_seats_in_use=row.chatgpt_seats_in_use,
        codex_seats_in_use=row.codex_seats_in_use,
        members=members,
    )


def _parse_members(raw: str | None) -> list[BillingMemberRecord]:
    if not raw:
        return []
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, list):
        return []

    members: list[BillingMemberRecord] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        member_id = str(item.get("id", "")).strip()
        if not member_id:
            continue
        members.append(
            BillingMemberRecord(
                id=member_id,
                name=str(item.get("name", "")).strip(),
                email=str(item.get("email", "")).strip(),
                role=str(item.get("role", "")).strip() or "Member",
                seat_type=str(item.get("seatType", "")).strip() or "ChatGPT",
                date_added=str(item.get("dateAdded", "")).strip(),
            )
        )
    return members
