from __future__ import annotations

from collections.abc import Sequence
from typing import Literal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Device


class DeviceRepositoryConflictError(ValueError):
    def __init__(self, field: Literal["name", "ip_address", "unknown"] = "unknown") -> None:
        self.field = field
        super().__init__("Device already exists")


class DevicesRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_entries(self) -> Sequence[Device]:
        result = await self._session.execute(select(Device).order_by(Device.created_at, Device.name))
        return list(result.scalars().all())

    async def exists_name(self, name: str) -> bool:
        result = await self._session.execute(select(Device.id).where(Device.name == name).limit(1))
        return result.scalar_one_or_none() is not None

    async def exists_ip_address(self, ip_address: str) -> bool:
        result = await self._session.execute(select(Device.id).where(Device.ip_address == ip_address).limit(1))
        return result.scalar_one_or_none() is not None

    async def add(self, name: str, ip_address: str) -> Device:
        row = Device(name=name, ip_address=ip_address)
        self._session.add(row)
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise DeviceRepositoryConflictError(_detect_conflict_field(exc)) from exc
        await self._session.refresh(row)
        return row

    async def delete(self, device_id: str) -> bool:
        row = await self._session.get(Device, device_id)
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.commit()
        return True


def _detect_conflict_field(exc: IntegrityError) -> Literal["name", "ip_address", "unknown"]:
    message = str(getattr(exc, "orig", exc)).lower()
    if "devices.name" in message or "(name)" in message:
        return "name"
    if "devices.ip_address" in message or "(ip_address)" in message:
        return "ip_address"
    return "unknown"
