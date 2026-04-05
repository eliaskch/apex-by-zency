"""
Router consultations — endpoints CRUD + upload audio + WebSocket statut.
"""
import asyncio
import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.storage import PDF_BUCKET, get_presigned_url, upload_audio, upload_pdf
from core.websocket import manager
from models.consultation import Consultation
from models.document import Document
from models.patient import Patient
from models.practitioner import Practitioner
from schemas.consultation import (
    ConsultationCreate,
    ConsultationListItem,
    ConsultationSchema,
    DocumentSchema,
    DocumentUpdateRequest,
    RecentConsultation,
    PatientSummary,
)
from services.auth import get_practitioner_from_token

router = APIRouter(prefix="/consultations", tags=["Consultations"])
security = HTTPBearer(auto_error=False)
logger = structlog.get_logger()


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


@router.post("", response_model=ConsultationSchema, status_code=status.HTTP_201_CREATED)
async def create_consultation(
    data: ConsultationCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> ConsultationSchema:
    """Créer une nouvelle consultation (statut idle)."""
    patient = await db.execute(
        select(Patient).where(
            Patient.id == data.patient_id,
            Patient.cabinet_id == practitioner.cabinet_id,
            Patient.is_active == True,  # noqa: E712
        )
    )
    if not patient.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient non trouvé")

    consultation = Consultation(
        patient_id=data.patient_id,
        practitioner_id=practitioner.id,
        act_type=data.act_type,
        specialty=data.specialty,
        status="idle",
    )
    db.add(consultation)
    await db.flush()

    logger.info(
        "consultation.created",
        consultation_id=str(consultation.id),
        act_type=data.act_type,
    )
    return ConsultationSchema.model_validate(consultation)


@router.post("/{consultation_id}/upload-audio", response_model=ConsultationSchema)
async def upload_consultation_audio(
    consultation_id: uuid.UUID,
    file: UploadFile,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> ConsultationSchema:
    """Upload le fichier audio et déclenche le pipeline IA."""
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.practitioner_id == practitioner.id,
        )
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation non trouvée")

    file_data = await file.read()
    if len(file_data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier audio vide")

    # Upload vers storage (S3 ou local)
    consultation.status = "uploading"
    await db.flush()

    audio_key = upload_audio(file_data, str(consultation_id), file.filename or "audio.webm")
    consultation.audio_url = audio_key
    consultation.status = "uploading"
    await db.flush()

    logger.info(
        "consultation.audio_uploaded",
        consultation_id=str(consultation_id),
        size=len(file_data),
    )

    # Déclencher le pipeline en arrière-plan (asyncio task, pas Celery)
    from tasks.pipeline import run_pipeline_async

    asyncio.create_task(run_pipeline_async(str(consultation_id)))

    return ConsultationSchema.model_validate(consultation)


@router.get("", response_model=list[ConsultationListItem])
async def list_consultations(
    patient_id: uuid.UUID | None = None,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> list[ConsultationListItem]:
    """Liste les consultations du praticien, filtrable par patient."""
    query = select(Consultation).where(Consultation.practitioner_id == practitioner.id)
    if patient_id:
        patient = await db.execute(
            select(Patient).where(
                Patient.id == patient_id,
                Patient.cabinet_id == practitioner.cabinet_id,
            )
        )
        if not patient.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient non trouvé")
        query = query.where(Consultation.patient_id == patient_id)

    query = query.order_by(Consultation.recorded_at.desc())
    result = await db.execute(query)
    return [ConsultationListItem.model_validate(c) for c in result.scalars().all()]


@router.get("/recent", response_model=list[RecentConsultation])
async def recent_consultations(
    limit: int = 10,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> list[RecentConsultation]:
    """Dernières consultations du cabinet avec info patient et document."""
    result = await db.execute(
        select(Consultation)
        .join(Patient, Consultation.patient_id == Patient.id)
        .where(Patient.cabinet_id == practitioner.cabinet_id)
        .order_by(Consultation.recorded_at.desc())
        .limit(limit)
    )
    consultations = result.scalars().all()

    items = []
    for c in consultations:
        doc_result = await db.execute(
            select(Document)
            .where(Document.consultation_id == c.id)
            .order_by(Document.version.desc())
            .limit(1)
        )
        doc = doc_result.scalar_one_or_none()

        pdf_url = None
        if doc and doc.pdf_url:
            pdf_url = get_presigned_url(PDF_BUCKET, doc.pdf_url)

        items.append(
            RecentConsultation(
                id=c.id,
                patient_id=c.patient_id,
                recorded_at=c.recorded_at,
                status=c.status,
                act_type=c.act_type,
                specialty=c.specialty,
                patient=PatientSummary.model_validate(c.patient),
                has_document=doc is not None,
                pdf_url=pdf_url,
            )
        )
    return items


@router.get("/{consultation_id}", response_model=ConsultationSchema)
async def get_consultation(
    consultation_id: uuid.UUID,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> ConsultationSchema:
    """Récupérer une consultation par ID."""
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.practitioner_id == practitioner.id,
        )
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation non trouvée")
    return ConsultationSchema.model_validate(consultation)


@router.get("/{consultation_id}/document", response_model=DocumentSchema)
async def get_consultation_document(
    consultation_id: uuid.UUID,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> DocumentSchema:
    """Récupérer le document généré pour une consultation."""
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.practitioner_id == practitioner.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation non trouvée")

    doc_result = await db.execute(
        select(Document)
        .where(Document.consultation_id == consultation_id)
        .order_by(Document.version.desc())
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document non encore généré")

    doc_schema = DocumentSchema.model_validate(document)
    if document.pdf_url:
        doc_schema.pdf_url = get_presigned_url(PDF_BUCKET, document.pdf_url)

    return doc_schema


@router.put("/{consultation_id}/document", response_model=DocumentSchema)
async def update_consultation_document(
    consultation_id: uuid.UUID,
    body: DocumentUpdateRequest,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
) -> DocumentSchema:
    """Met à jour le content_json du document et régénère le PDF."""
    # Vérifier accès
    result = await db.execute(
        select(Consultation)
        .join(Patient, Consultation.patient_id == Patient.id)
        .where(
            Consultation.id == consultation_id,
            Patient.cabinet_id == practitioner.cabinet_id,
        )
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation non trouvée")

    # Récupérer le dernier document
    doc_result = await db.execute(
        select(Document)
        .where(Document.consultation_id == consultation_id)
        .order_by(Document.version.desc())
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document non encore généré")

    # Mettre à jour le JSON et incrémenter la version
    document.content_json = body.content_json
    document.version += 1

    # Régénérer le PDF
    pdf_key = None
    try:
        from weasyprint import HTML
        from tasks.pipeline import _generate_pdf_html
        from services.prompts.dentaire import DENTAL_PROMPTS

        patient = consultation.patient
        patient_name = f"{patient.last_name} {patient.first_name}" if patient else "Inconnu"
        act_label = DENTAL_PROMPTS.get(consultation.act_type, {}).get("label", consultation.act_type)

        html_content = _generate_pdf_html(body.content_json, patient_name, act_label)
        pdf_bytes = HTML(string=html_content).write_pdf()
        pdf_key = upload_pdf(pdf_bytes, str(consultation_id))
        document.pdf_url = pdf_key
        logger.info("document.pdf_regenerated", consultation_id=str(consultation_id), version=document.version)
    except ImportError:
        logger.info("document.pdf_skipped", reason="weasyprint not installed")
    except Exception as e:
        logger.warning("document.pdf_regen_error", error=str(e))

    await db.flush()

    doc_schema = DocumentSchema.model_validate(document)
    if document.pdf_url:
        doc_schema.pdf_url = get_presigned_url(PDF_BUCKET, document.pdf_url)

    return doc_schema


@router.websocket("/{consultation_id}/ws")
async def consultation_websocket(
    websocket: WebSocket,
    consultation_id: uuid.UUID,
) -> None:
    """WebSocket pour recevoir les mises à jour de statut en temps réel."""
    cid = str(consultation_id)
    await manager.connect(cid, websocket)

    try:
        while True:
            # Garder la connexion ouverte — le client peut envoyer des pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(cid, websocket)
