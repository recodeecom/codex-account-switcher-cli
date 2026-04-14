from __future__ import annotations

from datetime import timedelta

import pytest
from sqlalchemy import update

from app.core.config.settings import get_settings
from app.core.crypto import TokenEncryptor
from app.core.utils.time import utcnow
from app.db.models import Account, AccountStatus, ApiKey
from app.db.session import SessionLocal
from app.modules.accounts.repository import AccountsRepository
from app.modules.request_logs.repository import RequestLogsRepository

pytestmark = pytest.mark.integration


def _make_account(account_id: str, email: str) -> Account:
    encryptor = TokenEncryptor()
    return Account(
        id=account_id,
        email=email,
        plan_type="plus",
        access_token_encrypted=encryptor.encrypt("access"),
        refresh_token_encrypted=encryptor.encrypt("refresh"),
        id_token_encrypted=encryptor.encrypt("id"),
        last_refresh=utcnow(),
        status=AccountStatus.ACTIVE,
        deactivation_reason=None,
    )


@pytest.mark.asyncio
async def test_request_logs_api_returns_recent(async_client, db_setup):
    async with SessionLocal() as session:
        accounts_repo = AccountsRepository(session)
        logs_repo = RequestLogsRepository(session)
        await accounts_repo.upsert(_make_account("acc_logs", "logs@example.com"))
        session.add(
            ApiKey(
                id="key_logs_1",
                name="Debug Key",
                key_hash="hash_logs_1",
                key_prefix="sk-test",
            )
        )
        await session.commit()

        now = utcnow()
        await logs_repo.add_log(
            account_id="acc_logs",
            request_id="req_logs_1",
            model="gpt-5.1",
            input_tokens=100,
            output_tokens=200,
            latency_ms=1200,
            status="success",
            error_code=None,
            requested_at=now - timedelta(minutes=1),
            transport="http",
        )
        await logs_repo.add_log(
            account_id="acc_logs",
            request_id="req_logs_2",
            model="gpt-5.1",
            input_tokens=50,
            output_tokens=0,
            latency_ms=300,
            status="error",
            error_code="rate_limit_exceeded",
            error_message="Rate limit reached",
            requested_at=now,
            api_key_id="key_logs_1",
            transport="websocket",
        )

    response = await async_client.get("/api/request-logs?limit=2")
    assert response.status_code == 200
    body = response.json()
    payload = body["requests"]
    assert len(payload) == 2
    assert body["total"] == 2
    assert body["hasMore"] is False

    latest = payload[0]
    assert latest["status"] == "rate_limit"
    assert latest["apiKeyName"] == "Debug Key"
    assert latest["errorCode"] == "rate_limit_exceeded"
    assert latest["errorMessage"] == "Rate limit reached"
    assert latest["transport"] == "websocket"

    older = payload[1]
    assert older["status"] == "ok"
    assert older["apiKeyName"] is None
    assert older["tokens"] == 300
    assert older["cachedInputTokens"] is None
    assert older["transport"] == "http"


@pytest.mark.asyncio
async def test_request_logs_usage_summary_returns_rolling_5h_and_7d_totals(async_client, db_setup):
    now = utcnow()
    async with SessionLocal() as session:
        accounts_repo = AccountsRepository(session)
        logs_repo = RequestLogsRepository(session)
        await accounts_repo.upsert(_make_account("acc_usage_a", "usage-a@example.com"))
        await accounts_repo.upsert(_make_account("acc_usage_b", "usage-b@example.com"))

        await logs_repo.add_log(
            account_id="acc_usage_a",
            request_id="req_usage_1",
            model="gpt-5.1",
            input_tokens=100,
            output_tokens=50,
            latency_ms=100,
            status="success",
            error_code=None,
            requested_at=now - timedelta(hours=2),
        )
        await logs_repo.add_log(
            account_id="acc_usage_a",
            request_id="req_usage_2",
            model="gpt-5.1",
            input_tokens=20,
            output_tokens=None,
            reasoning_tokens=40,
            latency_ms=100,
            status="success",
            error_code=None,
            requested_at=now - timedelta(hours=6),
        )
        await logs_repo.add_log(
            account_id="acc_usage_b",
            request_id="req_usage_3",
            model="gpt-5.1",
            input_tokens=30,
            output_tokens=10,
            latency_ms=100,
            status="success",
            error_code=None,
            requested_at=now - timedelta(hours=1),
        )
        await logs_repo.add_log(
            account_id=None,
            request_id="req_usage_4",
            model="gpt-5.1",
            input_tokens=5,
            output_tokens=5,
            latency_ms=100,
            status="success",
            error_code=None,
            requested_at=now - timedelta(minutes=30),
        )
        await logs_repo.add_log(
            account_id="acc_usage_b",
            request_id="req_usage_5",
            model="gpt-5.1",
            input_tokens=1000,
            output_tokens=1000,
            latency_ms=100,
            status="success",
            error_code=None,
            requested_at=now - timedelta(days=8),
        )

    response = await async_client.get("/api/request-logs/usage-summary")
    assert response.status_code == 200
    payload = response.json()
    fx_rate = get_settings().request_logs_usage_fx_usd_to_eur

    assert payload["last5h"]["totalTokens"] == 200
    assert payload["last7d"]["totalTokens"] == 260
    assert payload["last30d"]["totalTokens"] == 2260
    assert payload["fxRateUsdToEur"] == pytest.approx(fx_rate)

    assert payload["last5h"]["totalCostUsd"] > 0
    assert payload["last7d"]["totalCostUsd"] >= payload["last5h"]["totalCostUsd"]
    assert payload["last30d"]["totalCostUsd"] >= payload["last7d"]["totalCostUsd"]
    assert payload["last5h"]["totalCostEur"] == pytest.approx(payload["last5h"]["totalCostUsd"] * fx_rate)
    assert payload["last7d"]["totalCostEur"] == pytest.approx(payload["last7d"]["totalCostUsd"] * fx_rate)
    assert payload["last30d"]["totalCostEur"] == pytest.approx(payload["last30d"]["totalCostUsd"] * fx_rate)

    last5h_accounts = payload["last5h"]["accounts"]
    assert last5h_accounts[0]["accountId"] == "acc_usage_a"
    assert last5h_accounts[0]["tokens"] == 150
    assert last5h_accounts[0]["costUsd"] > 0
    assert last5h_accounts[0]["costEur"] == pytest.approx(last5h_accounts[0]["costUsd"] * fx_rate)
    assert last5h_accounts[1]["accountId"] == "acc_usage_b"
    assert last5h_accounts[1]["tokens"] == 40
    assert last5h_accounts[1]["costUsd"] > 0
    assert last5h_accounts[2]["accountId"] is None
    assert last5h_accounts[2]["tokens"] == 10
    assert last5h_accounts[2]["costUsd"] > 0

    last7d_accounts = payload["last7d"]["accounts"]
    assert last7d_accounts[0]["accountId"] == "acc_usage_a"
    assert last7d_accounts[0]["tokens"] == 210
    assert last7d_accounts[0]["costUsd"] >= last5h_accounts[0]["costUsd"]
    assert last7d_accounts[1]["accountId"] == "acc_usage_b"
    assert last7d_accounts[1]["tokens"] == 40
    assert last7d_accounts[2]["accountId"] is None
    assert last7d_accounts[2]["tokens"] == 10

    last30d_accounts = payload["last30d"]["accounts"]
    assert last30d_accounts[0]["accountId"] == "acc_usage_b"
    assert last30d_accounts[0]["tokens"] == 2040
    assert last30d_accounts[0]["costUsd"] >= last7d_accounts[1]["costUsd"]
    assert last30d_accounts[1]["accountId"] == "acc_usage_a"
    assert last30d_accounts[1]["tokens"] == 210
    assert last30d_accounts[2]["accountId"] is None
    assert last30d_accounts[2]["tokens"] == 10


@pytest.mark.asyncio
async def test_request_logs_usage_summary_prefers_persisted_eur_cost(async_client, db_setup):
    now = utcnow()
    account_id = "acc_usage_persisted_eur"
    persisted_cost_usd = 4.0
    persisted_cost_eur = 9.5

    async with SessionLocal() as session:
        accounts_repo = AccountsRepository(session)
        logs_repo = RequestLogsRepository(session)
        await accounts_repo.upsert(_make_account(account_id, "usage-persisted-eur@example.com"))
        log = await logs_repo.add_log(
            account_id=account_id,
            request_id="req_usage_persisted_eur",
            model="gpt-5.1",
            input_tokens=120,
            output_tokens=80,
            latency_ms=100,
            status="success",
            error_code=None,
            requested_at=now - timedelta(hours=1),
        )
        await session.execute(
            update(log.__class__)
            .where(log.__class__.id == log.id)
            .values(cost_usd=persisted_cost_usd, cost_eur=persisted_cost_eur)
        )
        await session.commit()

    response = await async_client.get("/api/request-logs/usage-summary")
    assert response.status_code == 200
    payload = response.json()

    assert payload["last30d"]["totalCostUsd"] == pytest.approx(persisted_cost_usd)
    assert payload["last30d"]["totalCostEur"] == pytest.approx(persisted_cost_eur)
    row_30d = next((row for row in payload["last30d"]["accounts"] if row["accountId"] == account_id), None)
    assert row_30d is not None
    assert row_30d["costUsd"] == pytest.approx(persisted_cost_usd)
    assert row_30d["costEur"] == pytest.approx(persisted_cost_eur)


@pytest.mark.asyncio
async def test_request_logs_usage_summary_uses_fx_fallback_when_persisted_eur_missing(async_client, db_setup):
    now = utcnow()
    account_id = "acc_usage_missing_eur"
    persisted_cost_usd = 3.25

    async with SessionLocal() as session:
        accounts_repo = AccountsRepository(session)
        logs_repo = RequestLogsRepository(session)
        await accounts_repo.upsert(_make_account(account_id, "usage-missing-eur@example.com"))
        log = await logs_repo.add_log(
            account_id=account_id,
            request_id="req_usage_missing_eur",
            model="gpt-5.1",
            input_tokens=40,
            output_tokens=30,
            latency_ms=100,
            status="success",
            error_code=None,
            requested_at=now - timedelta(hours=1),
        )
        await session.execute(
            update(log.__class__).where(log.__class__.id == log.id).values(cost_usd=persisted_cost_usd, cost_eur=None)
        )
        await session.commit()

    response = await async_client.get("/api/request-logs/usage-summary")
    assert response.status_code == 200
    payload = response.json()
    fx_rate = get_settings().request_logs_usage_fx_usd_to_eur
    expected_cost_eur = persisted_cost_usd * fx_rate

    assert payload["last30d"]["totalCostUsd"] == pytest.approx(persisted_cost_usd)
    assert payload["last30d"]["totalCostEur"] == pytest.approx(expected_cost_eur)
    row_30d = next((row for row in payload["last30d"]["accounts"] if row["accountId"] == account_id), None)
    assert row_30d is not None
    assert row_30d["costUsd"] == pytest.approx(persisted_cost_usd)
    assert row_30d["costEur"] == pytest.approx(expected_cost_eur)


@pytest.mark.asyncio
async def test_request_logs_usage_summary_keeps_deleted_accounts_within_7d_window(async_client, db_setup):
    now = utcnow()
    account_id = "acc_usage_deleted"
    email = "usage-deleted@example.com"

    async with SessionLocal() as session:
        accounts_repo = AccountsRepository(session)
        logs_repo = RequestLogsRepository(session)
        await accounts_repo.upsert(_make_account(account_id, email))
        await logs_repo.add_log(
            account_id=account_id,
            request_id="req_usage_deleted_1",
            model="gpt-5.1",
            input_tokens=80,
            output_tokens=20,
            latency_ms=100,
            status="success",
            error_code=None,
            requested_at=now - timedelta(hours=2),
        )

    deleted = await async_client.delete(f"/api/accounts/{account_id}")
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "deleted"

    listed_accounts = await async_client.get("/api/accounts")
    assert listed_accounts.status_code == 200
    assert all(account["accountId"] != account_id for account in listed_accounts.json()["accounts"])

    usage_summary = await async_client.get("/api/request-logs/usage-summary")
    assert usage_summary.status_code == 200
    payload = usage_summary.json()

    row_5h = next((row for row in payload["last5h"]["accounts"] if row["accountId"] == account_id), None)
    row_7d = next((row for row in payload["last7d"]["accounts"] if row["accountId"] == account_id), None)
    row_30d = next((row for row in payload["last30d"]["accounts"] if row["accountId"] == account_id), None)
    assert row_5h is not None
    assert row_7d is not None
    assert row_30d is not None
    assert row_5h["tokens"] == 100
    assert row_7d["tokens"] == 100
    assert row_30d["tokens"] == 100
    assert row_7d["accountEmail"] == email
