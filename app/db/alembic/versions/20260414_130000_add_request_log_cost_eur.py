"""add persisted eur cost to request_logs

Revision ID: 20260414_130000_add_request_log_cost_eur
Revises: 20260414_120000_add_projects_url_column
Create Date: 2026-04-14
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260414_130000_add_request_log_cost_eur"
down_revision = "20260414_120000_add_projects_url_column"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("request_logs"):
        return

    columns = {column["name"] for column in inspector.get_columns("request_logs")}
    if "cost_eur" in columns:
        return

    with op.batch_alter_table("request_logs") as batch_op:
        batch_op.add_column(sa.Column("cost_eur", sa.Float(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("request_logs"):
        return

    columns = {column["name"] for column in inspector.get_columns("request_logs")}
    if "cost_eur" not in columns:
        return

    with op.batch_alter_table("request_logs") as batch_op:
        batch_op.drop_column("cost_eur")
