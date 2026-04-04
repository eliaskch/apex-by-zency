"""
Service d'authentification — logique métier isolée des routers.
"""
import uuid
from datetime import timedelta

import structlog
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from models.cabinet import Cabinet
from models.practitioner import Practitioner
from schemas.auth import RegisterRequest

logger = structlog.get_logger()


async def create_cabinet_and_practitioner(
    data: RegisterRequest, db: AsyncSession
) -> tuple[Cabinet, Practitioner]:
    """Créer un cabinet et son praticien owner en transaction atomique."""
    cabinet = Cabinet(name=data.cabinet_name)
    db.add(cabinet)
    await db.flush()  # récupère l'id sans commit

    practitioner = Practitioner(
        cabinet_id=cabinet.id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        role="owner",
        specialty=data.specialty,
    )
    db.add(practitioner)
    await db.flush()

    logger.info(
        "auth.register",
        cabinet_id=str(cabinet.id),
        practitioner_id=str(practitioner.id),
    )
    return cabinet, practitioner


async def authenticate_practitioner(
    email: str, password: str, db: AsyncSession
) -> Practitioner | None:
    """Authentifier un praticien par email/mot de passe."""
    result = await db.execute(
        select(Practitioner).where(
            Practitioner.email == email.lower(),
            Practitioner.is_active == True,  # noqa: E712
        )
    )
    practitioner = result.scalar_one_or_none()

    if not practitioner or not verify_password(password, practitioner.hashed_password):
        logger.warning("auth.login.failed", email=email)
        return None

    logger.info("auth.login.success", practitioner_id=str(practitioner.id))
    return practitioner


def build_tokens(practitioner: Practitioner) -> tuple[str, str]:
    """Construire access + refresh tokens pour un praticien."""
    payload = {
        "sub": str(practitioner.id),
        "cabinet_id": str(practitioner.cabinet_id),
        "email": practitioner.email,
    }
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    return access_token, refresh_token


async def get_practitioner_by_id(
    practitioner_id: uuid.UUID, db: AsyncSession
) -> Practitioner | None:
    result = await db.execute(
        select(Practitioner).where(
            Practitioner.id == practitioner_id,
            Practitioner.is_active == True,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def get_practitioner_from_token(token: str, db: AsyncSession) -> Practitioner:
    """
    Dépendance FastAPI : valide le JWT et retourne le praticien connecté.
    Lève HTTPException si invalide.
    """
    from fastapi import HTTPException, status

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        practitioner_id_str: str | None = payload.get("sub")
        if not practitioner_id_str:
            raise credentials_exception
        practitioner_id = uuid.UUID(practitioner_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    practitioner = await get_practitioner_by_id(practitioner_id, db)
    if not practitioner:
        raise credentials_exception

    return practitioner
