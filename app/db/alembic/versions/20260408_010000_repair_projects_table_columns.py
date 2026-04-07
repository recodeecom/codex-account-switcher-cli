from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260408_010000_repair_projects_table_columns"
down_revision = "20260408_000000_add_business_billing_accounts_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("projects"):
        op.create_table(
            "projects",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("project_path", sa.Text(), nullable=True),
            sa.Column("sandbox_mode", sa.String(length=64), server_default="workspace-write", nullable=False),
            sa.Column("git_branch", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )
        return

    existing_columns = {column["name"] for column in inspector.get_columns("projects")}
    with op.batch_alter_table("projects") as batch_op:
        if "project_path" not in existing_columns:
            batch_op.add_column(sa.Column("project_path", sa.Text(), nullable=True))
        if "sandbox_mode" not in existing_columns:
            batch_op.add_column(
                sa.Column(
                    "sandbox_mode",
                    sa.String(length=64),
                    server_default="workspace-write",
                    nullable=False,
                )
            )
        if "git_branch" not in existing_columns:
            batch_op.add_column(sa.Column("git_branch", sa.String(length=255), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("projects"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("projects")}
    with op.batch_alter_table("projects") as batch_op:
        if "git_branch" in existing_columns:
            batch_op.drop_column("git_branch")
        if "sandbox_mode" in existing_columns:
            batch_op.drop_column("sandbox_mode")
        if "project_path" in existing_columns:
            batch_op.drop_column("project_path")
