from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import cast

import pytest

from app.modules.devices.repository import DeviceRepositoryConflictError
from app.modules.devices.service import (
    DeviceIpExistsError,
    DeviceNameExistsError,
    DevicesRepositoryPort,
    DevicesService,
    DeviceValidationError,
    normalize_device_name,
    normalize_ip_address,
)

pytestmark = pytest.mark.unit


@dataclass(slots=True)
class _Entry:
    id: str
    name: str
    ip_address: str
    created_at: datetime
    updated_at: datetime


class _Repo:
    def __init__(self) -> None:
        self._entries: dict[str, _Entry] = {}

    async def list_entries(self) -> Sequence[_Entry]:
        return sorted(self._entries.values(), key=lambda entry: (entry.created_at, entry.name))

    async def exists_name(self, name: str) -> bool:
        return any(entry.name == name for entry in self._entries.values())

    async def exists_ip_address(self, ip_address: str) -> bool:
        return any(entry.ip_address == ip_address for entry in self._entries.values())

    async def add(self, name: str, ip_address: str) -> _Entry:
        now = datetime.now(UTC)
        entry = _Entry(
            id=f"dev-{len(self._entries) + 1}",
            name=name,
            ip_address=ip_address,
            created_at=now,
            updated_at=now,
        )
        self._entries[entry.id] = entry
        return entry

    async def update(self, device_id: str, name: str, ip_address: str) -> _Entry | None:
        entry = self._entries.get(device_id)
        if entry is None:
            return None
        now = datetime.now(UTC)
        updated = _Entry(
            id=entry.id,
            name=name,
            ip_address=ip_address,
            created_at=entry.created_at,
            updated_at=now,
        )
        self._entries[device_id] = updated
        return updated

    async def delete(self, device_id: str) -> bool:
        return self._entries.pop(device_id, None) is not None


def test_normalize_device_name_rejects_blank_value() -> None:
    with pytest.raises(DeviceValidationError):
        normalize_device_name("   ")


def test_normalize_device_name_rejects_too_long_value() -> None:
    with pytest.raises(DeviceValidationError):
        normalize_device_name("x" * 129)


def test_normalize_ip_address_rejects_invalid_value() -> None:
    with pytest.raises(DeviceValidationError):
        normalize_ip_address("invalid")


def test_normalize_ip_address_normalizes_ipv6() -> None:
    assert normalize_ip_address("2001:0db8:0000:0000:0000:ff00:0042:8329") == "2001:db8::ff00:42:8329"


@pytest.mark.asyncio
async def test_add_device_rejects_duplicate_name() -> None:
    service = DevicesService(cast(DevicesRepositoryPort, _Repo()))
    await service.add_device("ksskringdistance03", "192.168.0.1")

    with pytest.raises(DeviceNameExistsError):
        await service.add_device("ksskringdistance03", "192.168.0.2")


@pytest.mark.asyncio
async def test_add_device_rejects_duplicate_ip() -> None:
    service = DevicesService(cast(DevicesRepositoryPort, _Repo()))
    await service.add_device("ksskringdistance03", "192.168.0.1")

    with pytest.raises(DeviceIpExistsError):
        await service.add_device("ksskringdistance04", "192.168.0.1")


@pytest.mark.asyncio
async def test_add_device_maps_repository_conflict_field() -> None:
    class _ConflictRepo(_Repo):
        async def exists_name(self, name: str) -> bool:  # noqa: ARG002
            return False

        async def exists_ip_address(self, ip_address: str) -> bool:  # noqa: ARG002
            return False

        async def add(self, name: str, ip_address: str) -> _Entry:  # noqa: ARG002
            raise DeviceRepositoryConflictError("ip_address")

    service = DevicesService(cast(DevicesRepositoryPort, _ConflictRepo()))

    with pytest.raises(DeviceIpExistsError):
        await service.add_device("ksskringdistance03", "192.168.0.1")


@pytest.mark.asyncio
async def test_update_device_success() -> None:
    service = DevicesService(cast(DevicesRepositoryPort, _Repo()))
    created = await service.add_device("old-name", "192.168.0.1")

    updated = await service.update_device(created.id, "new-name", "192.168.0.2")

    assert updated is not None
    assert updated.id == created.id
    assert updated.name == "new-name"
    assert updated.ip_address == "192.168.0.2"


@pytest.mark.asyncio
async def test_update_device_returns_none_when_missing() -> None:
    service = DevicesService(cast(DevicesRepositoryPort, _Repo()))

    updated = await service.update_device("missing", "new-name", "192.168.0.2")

    assert updated is None


@pytest.mark.asyncio
async def test_update_device_maps_repository_name_conflict() -> None:
    class _ConflictRepo(_Repo):
        async def update(self, device_id: str, name: str, ip_address: str) -> _Entry | None:  # noqa: ARG002
            raise DeviceRepositoryConflictError("name")

    service = DevicesService(cast(DevicesRepositoryPort, _ConflictRepo()))

    with pytest.raises(DeviceNameExistsError):
        await service.update_device("dev-1", "new-name", "192.168.0.2")


@pytest.mark.asyncio
async def test_update_device_maps_repository_ip_conflict() -> None:
    class _ConflictRepo(_Repo):
        async def update(self, device_id: str, name: str, ip_address: str) -> _Entry | None:  # noqa: ARG002
            raise DeviceRepositoryConflictError("ip_address")

    service = DevicesService(cast(DevicesRepositoryPort, _ConflictRepo()))

    with pytest.raises(DeviceIpExistsError):
        await service.update_device("dev-1", "new-name", "192.168.0.2")


@pytest.mark.asyncio
async def test_update_device_rejects_invalid_name() -> None:
    service = DevicesService(cast(DevicesRepositoryPort, _Repo()))

    with pytest.raises(DeviceValidationError):
        await service.update_device("dev-1", "   ", "192.168.0.2")


@pytest.mark.asyncio
async def test_update_device_rejects_invalid_ip() -> None:
    service = DevicesService(cast(DevicesRepositoryPort, _Repo()))

    with pytest.raises(DeviceValidationError):
        await service.update_device("dev-1", "new-name", "invalid")
