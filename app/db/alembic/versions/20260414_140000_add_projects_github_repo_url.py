from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260414_140000_add_projects_github_repo_url"
down_revision = "20260414_210000_add_switchboard_agents_environment_variables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("projects"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("projects")}
    if "github_repo_url" in existing_columns:
        return

    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(sa.Column("github_repo_url", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("projects"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("projects")}
    if "github_repo_url" not in existing_columns:
        return

    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_column("github_repo_url")
