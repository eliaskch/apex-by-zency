import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator


class AddressSchema(BaseModel):
    street: str = ""
    city: str = ""
    postal_code: str = ""


class PatientCreate(BaseModel):
    last_name: str
    first_name: str
    birth_date: date | None = None
    gender: Literal["M", "F", "autre"] | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: AddressSchema | None = None
    mutual_name: str | None = None
    mutual_number: str | None = None
    allergies: list[str] = []
    medical_notes: str | None = None

    @field_validator("last_name", "first_name")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Ce champ ne peut pas être vide")
        return v.strip()


class PatientUpdate(BaseModel):
    last_name: str | None = None
    first_name: str | None = None
    birth_date: date | None = None
    gender: Literal["M", "F", "autre"] | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: AddressSchema | None = None
    mutual_name: str | None = None
    mutual_number: str | None = None
    allergies: list[str] | None = None
    medical_notes: str | None = None

    @field_validator("last_name", "first_name")
    @classmethod
    def not_empty_if_provided(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Ce champ ne peut pas être vide")
        return v.strip() if v else v


class PatientSchema(BaseModel):
    id: uuid.UUID
    cabinet_id: uuid.UUID
    last_name: str
    first_name: str
    birth_date: date | None
    gender: str | None
    phone: str | None
    email: str | None
    address: dict | None
    mutual_name: str | None
    mutual_number: str | None
    allergies: list[str]
    medical_notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class PatientListItem(BaseModel):
    id: uuid.UUID
    cabinet_id: uuid.UUID
    last_name: str
    first_name: str
    birth_date: date | None
    gender: str | None
    phone: str | None
    email: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PatientSearchResult(BaseModel):
    id: uuid.UUID
    last_name: str
    first_name: str
    birth_date: date | None
    phone: str | None

    model_config = {"from_attributes": True}


class PatientListResponse(BaseModel):
    items: list[PatientListItem]
    total: int
