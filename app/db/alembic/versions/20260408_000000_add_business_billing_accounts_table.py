from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260408_000000_add_business_billing_accounts_table"
down_revision = "20260407_233000_add_projects_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("business_billing_accounts"):
        return

    op.create_table(
        "business_billing_accounts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=False),
        sa.Column("billing_cycle_start", sa.DateTime(), nullable=False),
        sa.Column("billing_cycle_end", sa.DateTime(), nullable=False),
        sa.Column("chatgpt_seats_in_use", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("codex_seats_in_use", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("members_json", sa.Text(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("domain"),
    )
    op.create_index(
        "idx_business_billing_accounts_domain",
        "business_billing_accounts",
        ["domain"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("business_billing_accounts"):
        return

    with op.batch_alter_table("business_billing_accounts") as batch_op:
        batch_op.drop_index("idx_business_billing_accounts_domain")
    op.drop_table("business_billing_accounts")
