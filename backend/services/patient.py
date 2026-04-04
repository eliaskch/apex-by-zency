"""
Service patients — logique métier isolée des routers.
Chaque requête filtre TOUJOURS par cabinet_id.
"""
import uuid

import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.patient import Patient
from schemas.patient import PatientCreate, PatientUpdate

logger = structlog.get_logger()


async def list_patients(
    cabinet_id: uuid.UUID,
    db: AsyncSession,
    search: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Patient], int]:
    """Liste paginée des patients actifs d'un cabinet avec recherche optionnelle."""
    base_query = select(Patient).where(
        Patient.cabinet_id == cabinet_id,
        Patient.is_active == True,  # noqa: E712
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        base_query = base_query.where(
            or_(
                Patient.last_name.ilike(term),
                Patient.first_name.ilike(term),
            )
        )

    # Total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginated results
    query = base_query.order_by(Patient.last_name, Patient.first_name).offset(skip).limit(limit)
    result = await db.execute(query)
    patients = list(result.scalars().all())

    return patients, total


async def get_patient(
    patient_id: uuid.UUID, cabinet_id: uuid.UUID, db: AsyncSession
) -> Patient | None:
    """Récupérer un patient par ID, filtré par cabinet_id."""
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.cabinet_id == cabinet_id,
            Patient.is_active == True,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def create_patient(
    cabinet_id: uuid.UUID, data: PatientCreate, db: AsyncSession
) -> Patient:
    """Créer un patient dans un cabinet."""
    patient_data = data.model_dump()

    # Convertir l'adresse en dict si c'est un modèle Pydantic
    if patient_data.get("address") and hasattr(data.address, "model_dump"):
        patient_data["address"] = data.address.model_dump()

    patient = Patient(cabinet_id=cabinet_id, **patient_data)
    db.add(patient)
    await db.flush()
    await db.refresh(patient)

    logger.info(
        "patient.created",
        patient_id=str(patient.id),
        cabinet_id=str(cabinet_id),
    )
    return patient


async def update_patient(
    patient_id: uuid.UUID,
    cabinet_id: uuid.UUID,
    data: PatientUpdate,
    db: AsyncSession,
) -> Patient | None:
    """Mettre à jour un patient (mise à jour partielle)."""
    patient = await get_patient(patient_id, cabinet_id, db)
    if not patient:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # Convertir l'adresse en dict si c'est un modèle Pydantic
    if "address" in update_data and update_data["address"] is not None and hasattr(data.address, "model_dump"):
        update_data["address"] = data.address.model_dump()

    for field, value in update_data.items():
        setattr(patient, field, value)

    await db.flush()
    await db.refresh(patient)

    logger.info(
        "patient.updated",
        patient_id=str(patient.id),
        cabinet_id=str(cabinet_id),
    )
    return patient


async def soft_delete_patient(
    patient_id: uuid.UUID, cabinet_id: uuid.UUID, db: AsyncSession
) -> bool:
    """Soft delete — met is_active à False, jamais de DELETE réel."""
    patient = await get_patient(patient_id, cabinet_id, db)
    if not patient:
        return False

    patient.is_active = False
    await db.flush()

    logger.info(
        "patient.soft_deleted",
        patient_id=str(patient.id),
        cabinet_id=str(cabinet_id),
    )
    return True


async def search_patients(
    cabinet_id: uuid.UUID, query: str, db: AsyncSession
) -> list[Patient]:
    """Recherche légère pour autocomplete — max 10 résultats."""
    if not query or not query.strip():
        return []

    term = f"%{query.strip()}%"
    result = await db.execute(
        select(Patient)
        .where(
            Patient.cabinet_id == cabinet_id,
            Patient.is_active == True,  # noqa: E712
            or_(
                Patient.last_name.ilike(term),
                Patient.first_name.ilike(term),
            ),
        )
        .order_by(Patient.last_name, Patient.first_name)
        .limit(10)
    )
    return list(result.scalars().all())
