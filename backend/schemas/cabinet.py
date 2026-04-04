import uuid
from datetime import datetime

from pydantic import BaseModel


class CabinetCreate(BaseModel):
    name: str
    specialty_focus: str = "dentaire"


class CabinetSchema(BaseModel):
    id: uuid.UUID
    name: str
    logo_url: str | None
    subscription_tier: str
    created_at: datetime

    model_config = {"from_attributes": True}
