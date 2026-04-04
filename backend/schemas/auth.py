import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    cabinet_name: str
    specialty: str = "dentaire"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        return v

    @field_validator("first_name", "last_name", "cabinet_name")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Ce champ ne peut pas être vide")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PractitionerMe(BaseModel):
    id: uuid.UUID
    cabinet_id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    rpps: str | None
    role: str
    specialty: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
