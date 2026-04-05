"""add consultations and documents tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-05 02:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- consultations ---
    op.create_table(
        "consultations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("practitioner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("audio_url", sa.String(500), nullable=True),
        sa.Column(
            "duration_seconds",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="idle",
        ),
        sa.Column("act_type", sa.String(50), nullable=False),
        sa.Column(
            "specialty",
            sa.String(50),
            nullable=False,
            server_default="dentaire",
        ),
        sa.Column("transcript", sa.Text(), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["patient_id"], ["patients.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["practitioner_id"], ["practitioners.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_consultations_patient_id", "consultations", ["patient_id"])
    op.create_index("ix_consultations_practitioner_id", "consultations", ["practitioner_id"])

    # --- documents ---
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("consultation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "doc_type",
            sa.String(50),
            nullable=False,
            server_default="compte_rendu",
        ),
        sa.Column("content_json", postgresql.JSONB(), nullable=True),
        sa.Column("pdf_url", sa.String(500), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["consultation_id"], ["consultations.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_documents_consultation_id", "documents", ["consultation_id"])


def downgrade() -> None:
    op.drop_index("ix_documents_consultation_id", table_name="documents")
    op.drop_table("documents")
    op.drop_index("ix_consultations_practitioner_id", table_name="consultations")
    op.drop_index("ix_consultations_patient_id", table_name="consultations")
    op.drop_table("consultations")
