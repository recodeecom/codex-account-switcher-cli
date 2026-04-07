from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.modules.billing.repository import (
    BillingAccountRecord,
    BillingMemberRecord,
    BillingRepository,
)


@dataclass(frozen=True, slots=True)
class BillingAccountsData:
    accounts: list[BillingAccountRecord]


class BillingService:
    def __init__(self, repository: BillingRepository) -> None:
        self._repository = repository

    async def get_accounts(self) -> BillingAccountsData:
        accounts = await self._repository.list_accounts()
        if not accounts:
            accounts = await self._repository.replace_accounts(DEFAULT_BILLING_ACCOUNTS)
        return BillingAccountsData(accounts=accounts)

    async def replace_accounts(self, accounts: list[BillingAccountRecord]) -> BillingAccountsData:
        _validate_accounts(accounts)
        updated = await self._repository.replace_accounts(accounts)
        return BillingAccountsData(accounts=updated)


def _validate_accounts(accounts: list[BillingAccountRecord]) -> None:
    seen_account_ids: set[str] = set()
    seen_domains: set[str] = set()

    for account in accounts:
        account_id = account.id.strip()
        if not account_id:
            raise ValueError("Business account id is required")
        if account_id in seen_account_ids:
            raise ValueError(f"Duplicate business account id: {account_id}")
        seen_account_ids.add(account_id)

        normalized_domain = account.domain.strip().lower()
        if not normalized_domain:
            raise ValueError("Business account domain is required")
        if normalized_domain in seen_domains:
            raise ValueError(f"Duplicate business account domain: {account.domain}")
        seen_domains.add(normalized_domain)

        if account.chatgpt_seats_in_use < 0:
            raise ValueError("ChatGPT seats in use must be non-negative")
        if account.codex_seats_in_use < 0:
            raise ValueError("Codex seats in use must be non-negative")

        seen_member_ids: set[str] = set()
        for member in account.members:
            member_id = member.id.strip()
            if not member_id:
                raise ValueError("Member id is required")
            if member_id in seen_member_ids:
                raise ValueError(f"Duplicate member id '{member_id}' in account '{account.domain}'")
            seen_member_ids.add(member_id)

            if member.role not in {"Owner", "Member"}:
                raise ValueError(f"Invalid member role '{member.role}' for '{member.email}'")
            if member.seat_type not in {"ChatGPT", "Codex"}:
                raise ValueError(f"Invalid member seat type '{member.seat_type}' for '{member.email}'")


def _date(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day)


def _member(
    *,
    id: str,
    name: str,
    email: str,
    role: str,
    seat_type: str,
    date_added: str,
) -> BillingMemberRecord:
    return BillingMemberRecord(
        id=id,
        name=name,
        email=email,
        role=role,
        seat_type=seat_type,
        date_added=date_added,
    )


def _account(
    *,
    id: str,
    domain: str,
    billing_cycle_start: datetime,
    billing_cycle_end: datetime,
    chatgpt_seats_in_use: int,
    codex_seats_in_use: int,
    members: list[BillingMemberRecord],
) -> BillingAccountRecord:
    return BillingAccountRecord(
        id=id,
        domain=domain,
        billing_cycle_start=billing_cycle_start,
        billing_cycle_end=billing_cycle_end,
        chatgpt_seats_in_use=chatgpt_seats_in_use,
        codex_seats_in_use=codex_seats_in_use,
        members=members,
    )


DEFAULT_BILLING_ACCOUNTS: list[BillingAccountRecord] = [
    _account(
        id="business-plan-edixai",
        domain="edixai.com",
        billing_cycle_start=_date(2026, 3, 23),
        billing_cycle_end=_date(2026, 4, 23),
        chatgpt_seats_in_use=5,
        codex_seats_in_use=5,
        members=[
            _member(
                id="member-bianka-belovics",
                name="Bianka Belovics",
                email="bia@edixai.com",
                role="Member",
                seat_type="ChatGPT",
                date_added="Mar 30, 2026",
            ),
            _member(
                id="member-business-webu",
                name="business webu",
                email="webubusiness@gmail.com",
                role="Member",
                seat_type="ChatGPT",
                date_added="Mar 31, 2026",
            ),
            _member(
                id="member-csoves",
                name="Csoves",
                email="csoves@edixai.com",
                role="Member",
                seat_type="Codex",
                date_added="Mar 23, 2026",
            ),
            _member(
                id="member-denver",
                name="denver",
                email="denver@edixai.com",
                role="Member",
                seat_type="Codex",
                date_added="Mar 23, 2026",
            ),
            _member(
                id="member-edixai-owner",
                name="Edix.ai (You)",
                email="admin@edixai.com",
                role="Owner",
                seat_type="ChatGPT",
                date_added="Mar 23, 2026",
            ),
            _member(
                id="member-nagy-viktor-csoves",
                name="Nagy Viktor",
                email="csoves.com@gmail.com",
                role="Member",
                seat_type="Codex",
                date_added="Apr 3, 2026",
            ),
            _member(
                id="member-nagy-viktor-second",
                name="Nagy Viktor",
                email="nagyvikt007@gmail.com",
                role="Member",
                seat_type="Codex",
                date_added="Apr 3, 2026",
            ),
            _member(
                id="member-viktor",
                name="Viktor",
                email="thedailyscooby@gmail.com",
                role="Member",
                seat_type="ChatGPT",
                date_added="Apr 3, 2026",
            ),
            _member(
                id="member-viktor-nagy",
                name="Viktor Nagy",
                email="nagyviktordp@edixai.com",
                role="Member",
                seat_type="Codex",
                date_added="Apr 3, 2026",
            ),
            _member(
                id="member-zeus",
                name="Zeus",
                email="zeus@edixai.com",
                role="Member",
                seat_type="ChatGPT",
                date_added="Apr 1, 2026",
            ),
        ],
    ),
    _account(
        id="business-plan-kozpont",
        domain="kozpontihusbolt.hu",
        billing_cycle_start=_date(2026, 3, 26),
        billing_cycle_end=_date(2026, 4, 26),
        chatgpt_seats_in_use=5,
        codex_seats_in_use=5,
        members=[
            _member(
                id="member-kozpont-admin",
                name="Kozpont Admin",
                email="admin@kozpontihusbolt.hu",
                role="Owner",
                seat_type="ChatGPT",
                date_added="Mar 23, 2026",
            ),
            _member(
                id="member-kozpont-support",
                name="Support Team",
                email="support@kozpontihusbolt.hu",
                role="Member",
                seat_type="ChatGPT",
                date_added="Mar 24, 2026",
            ),
            _member(
                id="member-kozpont-ops",
                name="Ops Coordinator",
                email="ops@kozpontihusbolt.hu",
                role="Member",
                seat_type="ChatGPT",
                date_added="Mar 25, 2026",
            ),
            _member(
                id="member-kozpont-sales",
                name="Sales Lead",
                email="sales@kozpontihusbolt.hu",
                role="Member",
                seat_type="ChatGPT",
                date_added="Mar 28, 2026",
            ),
            _member(
                id="member-kozpont-finance",
                name="Finance",
                email="finance@kozpontihusbolt.hu",
                role="Member",
                seat_type="ChatGPT",
                date_added="Mar 29, 2026",
            ),
            _member(
                id="member-kozpont-codex-1",
                name="Automation 1",
                email="codex1@kozpontihusbolt.hu",
                role="Member",
                seat_type="Codex",
                date_added="Mar 26, 2026",
            ),
            _member(
                id="member-kozpont-codex-2",
                name="Automation 2",
                email="codex2@kozpontihusbolt.hu",
                role="Member",
                seat_type="Codex",
                date_added="Mar 27, 2026",
            ),
            _member(
                id="member-kozpont-codex-3",
                name="Automation 3",
                email="codex3@kozpontihusbolt.hu",
                role="Member",
                seat_type="Codex",
                date_added="Mar 30, 2026",
            ),
            _member(
                id="member-kozpont-codex-4",
                name="Automation 4",
                email="codex4@kozpontihusbolt.hu",
                role="Member",
                seat_type="Codex",
                date_added="Mar 31, 2026",
            ),
            _member(
                id="member-kozpont-codex-5",
                name="Automation 5",
                email="codex5@kozpontihusbolt.hu",
                role="Member",
                seat_type="Codex",
                date_added="Apr 1, 2026",
            ),
        ],
    ),
    _account(
        id="business-plan-kronakert",
        domain="kronakert.hu",
        billing_cycle_start=_date(2026, 4, 1),
        billing_cycle_end=_date(2026, 5, 1),
        chatgpt_seats_in_use=3,
        codex_seats_in_use=3,
        members=[
            _member(
                id="member-kronakert-owner",
                name="Kronakert Owner",
                email="owner@kronakert.hu",
                role="Owner",
                seat_type="ChatGPT",
                date_added="Apr 1, 2026",
            ),
            _member(
                id="member-kronakert-admin",
                name="Admin Team",
                email="admin@kronakert.hu",
                role="Member",
                seat_type="ChatGPT",
                date_added="Apr 2, 2026",
            ),
            _member(
                id="member-kronakert-sales",
                name="Sales Ops",
                email="sales@kronakert.hu",
                role="Member",
                seat_type="ChatGPT",
                date_added="Apr 3, 2026",
            ),
            _member(
                id="member-kronakert-codex-1",
                name="Automation Runner 1",
                email="codex1@kronakert.hu",
                role="Member",
                seat_type="Codex",
                date_added="Apr 3, 2026",
            ),
            _member(
                id="member-kronakert-codex-2",
                name="Automation Runner 2",
                email="codex2@kronakert.hu",
                role="Member",
                seat_type="Codex",
                date_added="Apr 4, 2026",
            ),
            _member(
                id="member-kronakert-codex-3",
                name="Automation Runner 3",
                email="codex3@kronakert.hu",
                role="Member",
                seat_type="Codex",
                date_added="Apr 4, 2026",
            ),
        ],
    ),
]
