from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_devices_api_crud_and_validation(async_client):
    initial = await async_client.get("/api/devices")
    assert initial.status_code == 200
    assert initial.json() == {"entries": []}

    created = await async_client.post(
        "/api/devices",
        json={"name": "ksskringdistance03", "ipAddress": "192.168.0.1"},
    )
    assert created.status_code == 200
    created_payload = created.json()
    assert created_payload["name"] == "ksskringdistance03"
    assert created_payload["ipAddress"] == "192.168.0.1"
    assert isinstance(created_payload["id"], str)

    listed = await async_client.get("/api/devices")
    assert listed.status_code == 200
    listed_payload = listed.json()
    assert len(listed_payload["entries"]) == 1
    assert listed_payload["entries"][0]["id"] == created_payload["id"]

    duplicate_name = await async_client.post(
        "/api/devices",
        json={"name": "ksskringdistance03", "ipAddress": "192.168.0.2"},
    )
    assert duplicate_name.status_code == 409
    assert duplicate_name.json()["error"]["code"] == "device_name_exists"

    duplicate_ip = await async_client.post(
        "/api/devices",
        json={"name": "ksskringdistance04", "ipAddress": "192.168.0.1"},
    )
    assert duplicate_ip.status_code == 409
    assert duplicate_ip.json()["error"]["code"] == "device_ip_exists"

    invalid_name = await async_client.post(
        "/api/devices",
        json={"name": "   ", "ipAddress": "192.168.0.2"},
    )
    assert invalid_name.status_code == 400
    assert invalid_name.json()["error"]["code"] == "invalid_device_name"

    invalid_ip = await async_client.post(
        "/api/devices",
        json={"name": "ksskringdistance04", "ipAddress": "not-an-ip"},
    )
    assert invalid_ip.status_code == 400
    assert invalid_ip.json()["error"]["code"] == "invalid_ip"

    deleted = await async_client.delete(f"/api/devices/{created_payload['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"status": "deleted"}

    missing = await async_client.delete(f"/api/devices/{created_payload['id']}")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "device_not_found"


@pytest.mark.asyncio
async def test_devices_api_normalizes_ipv6(async_client):
    created = await async_client.post(
        "/api/devices",
        json={
            "name": "lab-router",
            "ipAddress": "2001:0db8:0000:0000:0000:ff00:0042:8329",
        },
    )
    assert created.status_code == 200
    assert created.json()["ipAddress"] == "2001:db8::ff00:42:8329"
