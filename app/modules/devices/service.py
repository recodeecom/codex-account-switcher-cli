from __future__ import annotations

import ipaddress
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol

from app.modules.devices.repository import DeviceRepositoryConflictError


class DeviceEntryLike(Protocol):
    id: str
    name: str
    ip_address: str
    created_at: datetime
    updated_at: datetime


class DevicesRepositoryPort(Protocol):
    async def list_entries(self) -> Sequence[DeviceEntryLike]: ...

    async def exists_name(self, name: str) -> bool: ...

    async def exists_ip_address(self, ip_address: str) -> bool: ...

    async def add(self, name: str, ip_address: str) -> DeviceEntryLike: ...

    async def delete(self, device_id: str) -> bool: ...


class DeviceValidationError(ValueError):
    def __init__(self, message: str, *, code: Literal["invalid_device_name", "invalid_ip"]) -> None:
        self.code = code
        super().__init__(message)


class DeviceNameExistsError(ValueError):
    pass


class DeviceIpExistsError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class DeviceEntryData:
    id: str
    name: str
    ip_address: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class DevicesListData:
    entries: list[DeviceEntryData]


class DevicesService:
    def __init__(self, repository: DevicesRepositoryPort) -> None:
        self._repository = repository

    async def list_devices(self) -> DevicesListData:
        rows = await self._repository.list_entries()
        entries = [
            DeviceEntryData(
                id=row.id,
                name=row.name,
                ip_address=row.ip_address,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]
        return DevicesListData(entries=entries)

    async def add_device(self, name: str, ip_address: str) -> DeviceEntryData:
        normalized_name = normalize_device_name(name)
        normalized_ip = normalize_ip_address(ip_address)

        if await self._repository.exists_name(normalized_name):
            raise DeviceNameExistsError("Device name already exists")
        if await self._repository.exists_ip_address(normalized_ip):
            raise DeviceIpExistsError("Device IP address already exists")

        try:
            row = await self._repository.add(normalized_name, normalized_ip)
        except DeviceRepositoryConflictError as exc:
            if exc.field == "name":
                raise DeviceNameExistsError("Device name already exists") from exc
            if exc.field == "ip_address":
                raise DeviceIpExistsError("Device IP address already exists") from exc
            raise

        return DeviceEntryData(
            id=row.id,
            name=row.name,
            ip_address=row.ip_address,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    async def remove_device(self, device_id: str) -> bool:
        return await self._repository.delete(device_id)


def normalize_device_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise DeviceValidationError("Device name is required", code="invalid_device_name")
    if len(normalized) > 128:
        raise DeviceValidationError("Device name must be 128 characters or fewer", code="invalid_device_name")
    return normalized


def normalize_ip_address(value: str) -> str:
    raw = value.strip()
    if not raw:
        raise DeviceValidationError("IP address is required", code="invalid_ip")
    try:
        return str(ipaddress.ip_address(raw))
    except ValueError as exc:
        raise DeviceValidationError("Invalid IP address", code="invalid_ip") from exc
