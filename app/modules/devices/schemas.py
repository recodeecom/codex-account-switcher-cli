from __future__ import annotations

from datetime import datetime

from app.modules.shared.schemas import DashboardModel


class DeviceEntry(DashboardModel):
    id: str
    name: str
    ip_address: str
    created_at: datetime
    updated_at: datetime


class DevicesResponse(DashboardModel):
    entries: list[DeviceEntry]


class DeviceCreateRequest(DashboardModel):
    name: str
    ip_address: str


class DeviceUpdateRequest(DashboardModel):
    name: str
    ip_address: str


class DeviceDeleteResponse(DashboardModel):
    status: str
