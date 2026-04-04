import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Cabinet(Base):
    __tablename__ = "cabinets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    subscription_tier: Mapped[str] = mapped_column(String(50), default="free", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    practitioners: Mapped[list["Practitioner"]] = relationship(  # noqa: F821
        "Practitioner", back_populates="cabinet", lazy="selectin"
    )
