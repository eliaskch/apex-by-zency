"""
Router d'authentification — endpoints publics + protégés.
"""
from datetime import timedelta

import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import create_access_token, decode_token
from models.practitioner import Practitioner
from schemas.auth import LoginRequest, PractitionerMe, RegisterRequest, TokenResponse
from services.auth import (
    authenticate_practitioner,
    build_tokens,
    create_cabinet_and_practitioner,
    get_practitioner_from_token,
)

router = APIRouter(prefix="/auth", tags=["Authentification"])
security = HTTPBearer()
logger = structlog.get_logger()

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_OPTIONS = {
    "httponly": True,
    "secure": settings.ENVIRONMENT != "development",
    "samesite": "lax",
    "max_age": settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    "path": "/auth",
}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Créer un compte praticien + cabinet (owner)."""
    # Vérifier que l'email n'est pas déjà utilisé
    existing = await db.execute(
        select(Practitioner).where(Practitioner.email == data.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà avec cet email",
        )

    _, practitioner = await create_cabinet_and_practitioner(data, db)
    access_token, refresh_token = build_tokens(practitioner)

    response.set_cookie(REFRESH_COOKIE_NAME, refresh_token, **REFRESH_COOKIE_OPTIONS)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Connexion — retourne access_token (body) + refresh_token (httpOnly cookie)."""
    practitioner = await authenticate_practitioner(data.email, data.password, db)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token, refresh_token = build_tokens(practitioner)
    response.set_cookie(REFRESH_COOKIE_NAME, refresh_token, **REFRESH_COOKIE_OPTIONS)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Renouveler l'access token avec le refresh token (cookie httpOnly)."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token manquant",
        )

    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Type de token invalide")
        practitioner_id = payload.get("sub")
        cabinet_id = payload.get("cabinet_id")
        email = payload.get("email")
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide ou expiré",
        )

    new_access_token = create_access_token(
        {"sub": practitioner_id, "cabinet_id": cabinet_id, "email": email}
    )
    return TokenResponse(access_token=new_access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    """Déconnexion — supprime le cookie de refresh."""
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/auth")


@router.get("/me", response_model=PractitionerMe)
async def me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> PractitionerMe:
    """Retourner le profil du praticien connecté."""
    practitioner = await get_practitioner_from_token(credentials.credentials, db)
    return PractitionerMe.model_validate(practitioner)
