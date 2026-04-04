"""add patients table

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cabinet_id", postgresql.UUID(as_uuid=True), nullable=False),
        # Identité
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(10), nullable=True),
        # Contact
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("address", postgresql.JSONB(), nullable=True),
        # Mutuelle
        sa.Column("mutual_name", sa.String(100), nullable=True),
        sa.Column("mutual_number", sa.String(50), nullable=True),
        # Médical
        sa.Column(
            "allergies",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("medical_notes", sa.Text(), nullable=True),
        # État
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["cabinet_id"], ["cabinets.id"], ondelete="CASCADE"),
    )

    # Index pour le filtre obligatoire par cabinet
    op.create_index("ix_patients_cabinet_id", "patients", ["cabinet_id"])
    # Index composite pour la recherche par nom dans un cabinet
    op.create_index(
        "ix_patients_cabinet_last_name", "patients", ["cabinet_id", "last_name"]
    )


def downgrade() -> None:
    op.drop_index("ix_patients_cabinet_last_name", table_name="patients")
    op.drop_index("ix_patients_cabinet_id", table_name="patients")
    op.drop_table("patients")
