"""
Pipeline IA asynchrone : transcription Whisper -> génération Claude -> (PDF optionnel).
Statuts : idle -> recording -> uploading -> transcribing -> generating -> done | error

Deux modes :
- Mode async (Render / dev sans Celery) : asyncio.create_task via run_pipeline_async()
- Mode Celery (Docker avec Redis) : @celery_app.task via process_consultation()
"""
import asyncio
import json
import io
import uuid
from datetime import date

import anthropic
import openai
import structlog
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import settings
from core.storage import download_audio, upload_pdf
from core.websocket import manager
from services.prompts.dentaire import get_prompt, get_whisper_prompt

logger = structlog.get_logger()

# --- Engine async dédié au pipeline (indépendant de la requête HTTP) ---
_pipeline_engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=5,
)
PipelineSession = async_sessionmaker(
    bind=_pipeline_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def _update_status(
    session: AsyncSession,
    consultation_id: str,
    status: str,
    progress: int = 0,
    **extra,
) -> None:
    """Met à jour le statut en DB et notifie via WebSocket."""
    from models.consultation import Consultation

    values = {"status": status, **extra}
    await session.execute(
        update(Consultation)
        .where(Consultation.id == uuid.UUID(consultation_id))
        .values(**values)
    )
    await session.commit()
    await manager.send_status(consultation_id, status, progress)


def _generate_pdf_html(content: dict, patient_name: str, act_label: str) -> str:
    """Génère le HTML pour le PDF avec du CSS inline."""
    rows = ""
    for key, value in content.items():
        if isinstance(value, list):
            items_html = ""
            for item in value:
                if isinstance(item, dict):
                    items_html += "<li>" + " — ".join(
                        f"{k}: {v}" for k, v in item.items() if v
                    ) + "</li>"
                else:
                    items_html += f"<li>{item}</li>"
            value_html = f"<ul>{items_html}</ul>"
        elif isinstance(value, dict):
            sub = "<br>".join(
                f"<strong>{k}</strong> : {v}" for k, v in value.items() if v
            )
            value_html = sub
        elif value is None:
            value_html = '<em style="color:#888;">Non renseigné</em>'
        else:
            value_html = str(value)

        label = key.replace("_", " ").capitalize()
        rows += f"""
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-weight:600;
                        vertical-align:top;width:200px;color:#1a1a1a;">{label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#333;">{value_html}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page {{ size: A4; margin: 2cm; }}
        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
               font-size: 11pt; color: #1a1a1a; line-height: 1.5; }}
        .header {{ border-bottom: 3px solid #1A6BFF; padding-bottom: 12px;
                   margin-bottom: 24px; }}
        .header h1 {{ color: #1A6BFF; font-size: 18pt; margin: 0; }}
        .header .subtitle {{ color: #666; font-size: 10pt; margin-top: 4px; }}
        .meta {{ display: flex; justify-content: space-between; margin-bottom: 20px;
                 font-size: 10pt; color: #555; }}
        table {{ width: 100%; border-collapse: collapse; }}
        ul {{ margin: 4px 0; padding-left: 20px; }}
        .footer {{ margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd;
                   font-size: 9pt; color: #888; text-align: center; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>APEX — Compte Rendu</h1>
        <div class="subtitle">{act_label}</div>
    </div>
    <div class="meta">
        <span><strong>Patient :</strong> {patient_name}</span>
        <span><strong>Date :</strong> {content.get('date', str(date.today()))}</span>
    </div>
    <table>{rows}</table>
    <div class="footer">
        Généré automatiquement par APEX by Zency — Ce document ne se substitue pas au dossier médical.
    </div>
</body>
</html>"""


async def run_pipeline_async(consultation_id: str) -> None:
    """
    Pipeline complet en mode async (pas de Celery).
    Tourne dans un asyncio.create_task lancé par le router.
    """
    from models.consultation import Consultation
    from models.document import Document
    from models.patient import Patient
    from sqlalchemy import select

    async with PipelineSession() as session:
        try:
            # Charger la consultation
            result = await session.execute(
                select(Consultation).where(Consultation.id == uuid.UUID(consultation_id))
            )
            consultation = result.scalar_one_or_none()
            if not consultation:
                logger.error("pipeline.consultation_not_found", consultation_id=consultation_id)
                return

            # Charger le patient
            result = await session.execute(
                select(Patient).where(Patient.id == consultation.patient_id)
            )
            patient = result.scalar_one_or_none()

            patient_name = f"{patient.last_name} {patient.first_name}" if patient else "Inconnu"
            patient_birth = str(patient.birth_date) if patient and patient.birth_date else "Non renseignée"
            patient_allergies = ", ".join(patient.allergies) if patient and patient.allergies else "Aucune"
            patient_notes = patient.medical_notes or "Aucun" if patient else "Aucun"

            logger.info("pipeline.start", consultation_id=consultation_id, act_type=consultation.act_type)

            # --- ÉTAPE 1 : Transcription Whisper ---
            await _update_status(session, consultation_id, "transcribing", progress=10)

            audio_data = download_audio(consultation.audio_url)
            logger.info("pipeline.audio_downloaded", size=len(audio_data))

            whisper_prompt = get_whisper_prompt(consultation.specialty)
            client_openai = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            ext = consultation.audio_url.rsplit(".", 1)[-1] if consultation.audio_url else "webm"
            audio_file = io.BytesIO(audio_data)
            audio_file.name = f"audio.{ext}"

            transcription = await client_openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="fr",
                prompt=whisper_prompt,
            )
            transcript_text = transcription.text

            await _update_status(session, consultation_id, "transcribing", progress=40)

            # Sauvegarder le transcript
            await session.execute(
                update(Consultation)
                .where(Consultation.id == uuid.UUID(consultation_id))
                .values(transcript=transcript_text)
            )
            await session.commit()

            logger.info("pipeline.transcribed", length=len(transcript_text))

            # --- ÉTAPE 2 : Génération du compte rendu (Claude) ---
            await _update_status(session, consultation_id, "generating", progress=50)

            system_prompt = get_prompt(consultation.specialty, consultation.act_type)
            if not system_prompt:
                system_prompt = (
                    "Tu es un assistant médical. Génère un compte rendu JSON structuré "
                    "à partir de la transcription suivante. Réponds uniquement en JSON valide.\n\n"
                    f"TRANSCRIPTION :\n{transcript_text}"
                )
            else:
                system_prompt = system_prompt.format(
                    patient_name=patient_name,
                    patient_birth_date=patient_birth,
                    patient_allergies=patient_allergies,
                    patient_notes=patient_notes,
                    transcript=transcript_text,
                )

            client_anthropic = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

            response = await client_anthropic.messages.create(
                model="claude-3-5-sonnet-latest",
                max_tokens=4096,
                messages=[{"role": "user", "content": "Génère le compte rendu JSON."}],
                system=system_prompt,
            )

            raw_content = response.content[0].text
            await _update_status(session, consultation_id, "generating", progress=70)

            # Parser le JSON — retry une fois si invalide
            content_json = None
            try:
                content_json = json.loads(raw_content)
            except json.JSONDecodeError:
                logger.warning("pipeline.json_invalid_first_try", consultation_id=consultation_id)
                retry_response = await client_anthropic.messages.create(
                    model="claude-3-5-sonnet-latest",
                    max_tokens=4096,
                    messages=[
                        {"role": "user", "content": "Génère le compte rendu JSON."},
                        {"role": "assistant", "content": raw_content},
                        {
                            "role": "user",
                            "content": "Ta réponse n'est pas du JSON valide. "
                            "Renvoie UNIQUEMENT le JSON, sans texte ni markdown ni backticks.",
                        },
                    ],
                    system=system_prompt,
                )
                raw_content = retry_response.content[0].text
                cleaned = raw_content.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                    cleaned = cleaned.rsplit("```", 1)[0]
                content_json = json.loads(cleaned)

            logger.info("pipeline.report_generated", consultation_id=consultation_id)

            # --- ÉTAPE 3 : Génération du PDF (optionnel — skip si WeasyPrint absent) ---
            await _update_status(session, consultation_id, "generating", progress=80)

            pdf_key = None
            try:
                from weasyprint import HTML

                act_label = get_prompt(consultation.specialty, consultation.act_type) or consultation.act_type
                from services.prompts.dentaire import DENTAL_PROMPTS
                act_label = DENTAL_PROMPTS.get(consultation.act_type, {}).get("label", consultation.act_type)

                html_content = _generate_pdf_html(content_json, patient_name, act_label)
                pdf_bytes = HTML(string=html_content).write_pdf()
                pdf_key = upload_pdf(pdf_bytes, consultation_id)
                logger.info("pipeline.pdf_generated", consultation_id=consultation_id)
            except ImportError:
                logger.info("pipeline.pdf_skipped", reason="weasyprint not installed")
            except Exception as e:
                logger.warning("pipeline.pdf_error", error=str(e))

            await _update_status(session, consultation_id, "generating", progress=90)

            # --- ÉTAPE 4 : Créer le Document et finaliser ---
            document = Document(
                consultation_id=uuid.UUID(consultation_id),
                doc_type="compte_rendu",
                content_json=content_json,
                pdf_url=pdf_key,
                version=1,
            )
            session.add(document)
            await session.commit()

            await _update_status(session, consultation_id, "done", progress=100)
            logger.info("pipeline.done", consultation_id=consultation_id, document_id=str(document.id))

        except json.JSONDecodeError as exc:
            logger.error("pipeline.json_error", consultation_id=consultation_id, error=str(exc))
            await _update_status(session, consultation_id, "error")

        except Exception as exc:
            logger.error("pipeline.error", consultation_id=consultation_id, error=str(exc))
            try:
                await _update_status(session, consultation_id, "error")
            except Exception:
                pass
