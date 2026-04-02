from __future__ import annotations

from fastapi import APIRouter, Body, Depends

from app.core.auth.dependencies import set_dashboard_error_format, validate_dashboard_session
from app.core.exceptions import DashboardBadRequestError, DashboardConflictError, DashboardNotFoundError
from app.dependencies import DevicesContext, get_devices_context
from app.modules.devices.schemas import DeviceCreateRequest, DeviceDeleteResponse, DeviceEntry, DevicesResponse
from app.modules.devices.service import DeviceIpExistsError, DeviceNameExistsError, DeviceValidationError

router = APIRouter(
    prefix="/api/devices",
    tags=["dashboard"],
    dependencies=[Depends(validate_dashboard_session), Depends(set_dashboard_error_format)],
)


@router.get("", response_model=DevicesResponse)
async def list_devices(
    context: DevicesContext = Depends(get_devices_context),
) -> DevicesResponse:
    payload = await context.service.list_devices()
    return DevicesResponse(
        entries=[
            DeviceEntry(
                id=entry.id,
                name=entry.name,
                ip_address=entry.ip_address,
                created_at=entry.created_at,
                updated_at=entry.updated_at,
            )
            for entry in payload.entries
        ]
    )


@router.post("", response_model=DeviceEntry)
async def create_device(
    payload: DeviceCreateRequest = Body(...),
    context: DevicesContext = Depends(get_devices_context),
) -> DeviceEntry:
    try:
        created = await context.service.add_device(name=payload.name, ip_address=payload.ip_address)
    except DeviceValidationError as exc:
        raise DashboardBadRequestError(str(exc), code=exc.code) from exc
    except DeviceNameExistsError as exc:
        raise DashboardConflictError(str(exc), code="device_name_exists") from exc
    except DeviceIpExistsError as exc:
        raise DashboardConflictError(str(exc), code="device_ip_exists") from exc

    return DeviceEntry(
        id=created.id,
        name=created.name,
        ip_address=created.ip_address,
        created_at=created.created_at,
        updated_at=created.updated_at,
    )


@router.delete("/{device_id}", response_model=DeviceDeleteResponse)
async def delete_device(
    device_id: str,
    context: DevicesContext = Depends(get_devices_context),
) -> DeviceDeleteResponse:
    deleted = await context.service.remove_device(device_id)
    if not deleted:
        raise DashboardNotFoundError("Device not found", code="device_not_found")
    return DeviceDeleteResponse(status="deleted")
