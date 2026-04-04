"""
Pipeline IA asynchrone : transcription Whisper → génération Claude → PDF.
Statuts : idle → recording → uploading → transcribing → generating → done | error
"""
import structlog

from tasks.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(bind=True, max_retries=3, name="tasks.pipeline.process_consultation")
def process_consultation(self, consultation_id: str) -> dict:
    """
    Pipeline complet pour une consultation :
    1. Télécharge l'audio depuis S3
    2. Transcription via Whisper API
    3. Génération du CR via Claude API
    4. Génération du PDF via WeasyPrint
    5. Notifie le frontend via WebSocket
    """
    try:
        logger.info("pipeline.start", consultation_id=consultation_id)

        # Les étapes seront implémentées en Phase 3
        # Pour l'instant : placeholder avec structure complète

        return {"status": "done", "consultation_id": consultation_id}

    except Exception as exc:
        logger.error("pipeline.error", consultation_id=consultation_id, error=str(exc))
        raise self.retry(exc=exc, countdown=30)
