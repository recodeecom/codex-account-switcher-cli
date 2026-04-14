"""add environment variables storage for switchboard agents

Revision ID: 20260414_210000_add_switchboard_agents_environment_variables
Revises: 20260414_130000_add_request_log_cost_eur
Create Date: 2026-04-14
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260414_210000_add_switchboard_agents_environment_variables"
down_revision = "20260414_130000_add_request_log_cost_eur"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("switchboard_agents"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("switchboard_agents")}
    if "environment_variables_json" in existing_columns:
        return

    with op.batch_alter_table("switchboard_agents") as batch_op:
        batch_op.add_column(
            sa.Column(
                "environment_variables_json",
                sa.Text(),
                nullable=False,
                server_default=sa.text("'[]'"),
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("switchboard_agents"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("switchboard_agents")}
    if "environment_variables_json" not in existing_columns:
        return

    with op.batch_alter_table("switchboard_agents") as batch_op:
        batch_op.drop_column("environment_variables_json")
