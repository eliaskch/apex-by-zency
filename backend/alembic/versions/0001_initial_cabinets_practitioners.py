"""initial: cabinets + practitioners

Revision ID: 0001
Revises:
Create Date: 2026-04-04 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cabinets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("subscription_tier", sa.String(50), nullable=False, server_default="free"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "practitioners",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cabinet_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("rpps", sa.String(20), nullable=True),
        sa.Column("role", sa.String(50), nullable=False, server_default="owner"),
        sa.Column("specialty", sa.String(100), nullable=False, server_default="dentaire"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["cabinet_id"], ["cabinets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_practitioners_email", "practitioners", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_practitioners_email", table_name="practitioners")
    op.drop_table("practitioners")
    op.drop_table("cabinets")
