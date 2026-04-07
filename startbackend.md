CODEX_LB_DATABASE_URL=sqlite+aiosqlite:///$HOME/.codex-lb/store.db \
 uv run python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 2455
