"""
Router dashboard — métriques et statistiques pour le praticien connecté.
"""
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.consultation import Consultation
from models.document import Document
from models.patient import Patient
from models.practitioner import Practitioner
from services.auth import get_practitioner_from_token

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
security = HTTPBearer(auto_error=False)
logger = structlog.get_logger()

TIME_SAVED_PER_CONSULTATION = 30  # minutes


async def get_current_practitioner(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Practitioner:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await get_practitioner_from_token(credentials.credentials, db)


class DashboardMetrics(BaseModel):
    consultations_count: int
    documents_count: int
    time_saved_minutes: int
    patients_count: int


@router.get("/metrics", response_model=DashboardMetrics)
async def get_metrics(
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> DashboardMetrics:
    """Métriques du mois en cours pour le cabinet du praticien."""
    cabinet_id = practitioner.cabinet_id
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Consultations terminées ce mois
    consult_count = await db.scalar(
        select(func.count(Consultation.id))
        .join(Patient, Consultation.patient_id == Patient.id)
        .where(
            Patient.cabinet_id == cabinet_id,
            Consultation.status == "done",
            Consultation.recorded_at >= month_start,
        )
    ) or 0

    # Documents générés ce mois
    doc_count = await db.scalar(
        select(func.count(Document.id))
        .join(Consultation, Document.consultation_id == Consultation.id)
        .join(Patient, Consultation.patient_id == Patient.id)
        .where(
            Patient.cabinet_id == cabinet_id,
            Document.created_at >= month_start,
        )
    ) or 0

    # Patients actifs du cabinet
    patient_count = await db.scalar(
        select(func.count(Patient.id)).where(
            Patient.cabinet_id == cabinet_id,
            Patient.is_active == True,  # noqa: E712
        )
    ) or 0

    return DashboardMetrics(
        consultations_count=consult_count,
        documents_count=doc_count,
        time_saved_minutes=consult_count * TIME_SAVED_PER_CONSULTATION,
        patients_count=patient_count,
    )
