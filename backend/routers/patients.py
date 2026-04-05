"""
Router patients — endpoints CRUD protégés par authentification.
Chaque route utilise le cabinet_id du praticien connecté.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.practitioner import Practitioner
from schemas.patient import (
    PatientCreate,
    PatientListResponse,
    PatientSchema,
    PatientSearchResult,
    PatientUpdate,
)
from services.auth import get_practitioner_from_token
from services.patient import (
    create_patient,
    get_patient,
    list_patients,
    search_patients,
    soft_delete_patient,
    update_patient,
)

router = APIRouter(prefix="/patients", tags=["Patients"])
security = HTTPBearer(auto_error=False)


async def get_current_practitioner(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Practitioner:
    """Dépendance : extraire le praticien connecté depuis le JWT."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await get_practitioner_from_token(credentials.credentials, db)


@router.get("", response_model=PatientListResponse)
async def list_patients_endpoint(
    search: str | None = Query(default=None, description="Recherche par nom/prénom"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> PatientListResponse:
    """Liste paginée des patients du cabinet."""
    patients, total = await list_patients(
        cabinet_id=practitioner.cabinet_id,
        db=db,
        search=search,
        skip=skip,
        limit=limit,
    )
    return PatientListResponse(
        items=[p for p in patients],
        total=total,
    )


@router.post("", response_model=PatientSchema, status_code=status.HTTP_201_CREATED)
async def create_patient_endpoint(
    data: PatientCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> PatientSchema:
    """Créer un nouveau patient dans le cabinet."""
    patient = await create_patient(
        cabinet_id=practitioner.cabinet_id,
        data=data,
        db=db,
    )
    return PatientSchema.model_validate(patient)


@router.get("/search", response_model=list[PatientSearchResult])
async def search_patients_endpoint(
    q: str = Query(default="", description="Terme de recherche pour autocomplete"),
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> list[PatientSearchResult]:
    """Recherche autocomplete — max 10 résultats."""
    patients = await search_patients(
        cabinet_id=practitioner.cabinet_id,
        query=q,
        db=db,
    )
    return [PatientSearchResult.model_validate(p) for p in patients]


@router.get("/{patient_id}", response_model=PatientSchema)
async def get_patient_endpoint(
    patient_id: uuid.UUID,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> PatientSchema:
    """Récupérer la fiche complète d'un patient."""
    patient = await get_patient(
        patient_id=patient_id,
        cabinet_id=practitioner.cabinet_id,
        db=db,
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient non trouvé",
        )
    return PatientSchema.model_validate(patient)


@router.put("/{patient_id}", response_model=PatientSchema)
async def update_patient_endpoint(
    patient_id: uuid.UUID,
    data: PatientUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> PatientSchema:
    """Mettre à jour un patient."""
    patient = await update_patient(
        patient_id=patient_id,
        cabinet_id=practitioner.cabinet_id,
        data=data,
        db=db,
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient non trouvé",
        )
    return PatientSchema.model_validate(patient)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient_endpoint(
    patient_id: uuid.UUID,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft delete — désactiver un patient (jamais de suppression réelle)."""
    deleted = await soft_delete_patient(
        patient_id=patient_id,
        cabinet_id=practitioner.cabinet_id,
        db=db,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient non trouvé",
        )
