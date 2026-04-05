import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from core.specialties import is_valid_act


class ConsultationCreate(BaseModel):
    patient_id: uuid.UUID
    act_type: str
    specialty: str = "dentaire"

    @field_validator("act_type")
    @classmethod
    def validate_act_type(cls, v: str, info) -> str:
        specialty = info.data.get("specialty", "dentaire")
        if not is_valid_act(specialty, v):
            raise ValueError(f"Acte '{v}' invalide pour la spécialité '{specialty}'")
        return v


class ConsultationSchema(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    practitioner_id: uuid.UUID
    recorded_at: datetime
    audio_url: str | None
    duration_seconds: int
    status: str
    act_type: str
    specialty: str
    transcript: str | None

    model_config = {"from_attributes": True}


class ConsultationListItem(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    practitioner_id: uuid.UUID
    recorded_at: datetime
    status: str
    act_type: str
    specialty: str
    duration_seconds: int

    model_config = {"from_attributes": True}


class DocumentSchema(BaseModel):
    id: uuid.UUID
    consultation_id: uuid.UUID
    doc_type: str
    content_json: dict | None
    pdf_url: str | None
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}
