from celery import Celery

from core.config import settings

celery_app = Celery(
    "apex",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["tasks.pipeline"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Paris",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
