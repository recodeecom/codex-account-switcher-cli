from __future__ import annotations

import pytest
from sqlalchemy.exc import ResourceClosedError

from app.core.config.settings import get_settings
from app.db.session import SessionLocal
from app.modules.request_logs.repository import RequestLogsRepository


@pytest.mark.asyncio
async def test_add_log_ignores_closed_transaction(monkeypatch) -> None:
    async with SessionLocal() as session:
        repo = RequestLogsRepository(session)

        async def _commit_failure() -> None:
            raise ResourceClosedError("This transaction is closed")

        async def _refresh_failure(_: object) -> None:
            raise AssertionError("refresh should not be called after commit failure")

        monkeypatch.setattr(session, "commit", _commit_failure)
        monkeypatch.setattr(session, "refresh", _refresh_failure)

        log = await repo.add_log(
            account_id="acc",
            request_id="req",
            model="gpt-5.2",
            input_tokens=1000,
            output_tokens=500,
            latency_ms=1,
            status="success",
            error_code=None,
        )

        assert log.request_id == "req"
        assert log.cost_usd is not None
        assert log.cost_eur == pytest.approx(log.cost_usd * get_settings().request_logs_usage_fx_usd_to_eur)
