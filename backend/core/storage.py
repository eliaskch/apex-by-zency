"""
Service de stockage — S3 (MinIO/OVH) ou local filesystem (fallback Render).
Deux buckets logiques : audio et PDF.
"""
import io
import os
import uuid
from pathlib import Path

import structlog

from core.config import settings

logger = structlog.get_logger()

AUDIO_BUCKET = "apex-audio-dev"
PDF_BUCKET = "apex-pdf-dev"

# Répertoire local pour le stockage quand S3 n'est pas configuré
LOCAL_STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", "/tmp/apex-storage"))


def _use_s3() -> bool:
    """Vérifie si S3 est configuré et utilisable."""
    return bool(settings.S3_ENDPOINT and settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY
                and settings.S3_ENDPOINT != "http://localhost:9000")


def _get_s3_client():
    import boto3
    from botocore.config import Config as BotoConfig
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=BotoConfig(signature_version="s3v4"),
    )


def ensure_buckets() -> None:
    """Créer les buckets/dossiers s'ils n'existent pas."""
    if _use_s3():
        from botocore.exceptions import ClientError
        client = _get_s3_client()
        for bucket in (AUDIO_BUCKET, PDF_BUCKET):
            try:
                client.head_bucket(Bucket=bucket)
            except ClientError:
                try:
                    client.create_bucket(Bucket=bucket)
                    logger.info("storage.bucket_created", bucket=bucket)
                except ClientError as e:
                    logger.warning("storage.bucket_create_error", bucket=bucket, error=str(e))
    else:
        # Local filesystem
        for bucket in (AUDIO_BUCKET, PDF_BUCKET):
            (LOCAL_STORAGE_DIR / bucket).mkdir(parents=True, exist_ok=True)
        logger.info("storage.local_dirs_created", path=str(LOCAL_STORAGE_DIR))


def upload_audio(file_data: bytes, consultation_id: str, filename: str) -> str:
    """Upload un fichier audio. Retourne le chemin/clé."""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "webm"
    key = f"consultations/{consultation_id}/audio.{ext}"

    if _use_s3():
        client = _get_s3_client()
        client.upload_fileobj(
            io.BytesIO(file_data),
            AUDIO_BUCKET,
            key,
            ExtraArgs={"ContentType": f"audio/{ext}"},
        )
    else:
        path = LOCAL_STORAGE_DIR / AUDIO_BUCKET / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(file_data)

    logger.info("storage.audio_uploaded", key=key, size=len(file_data))
    return key


def download_audio(key: str) -> bytes:
    """Télécharge un fichier audio."""
    if _use_s3():
        client = _get_s3_client()
        buf = io.BytesIO()
        client.download_fileobj(AUDIO_BUCKET, key, buf)
        buf.seek(0)
        return buf.read()
    else:
        path = LOCAL_STORAGE_DIR / AUDIO_BUCKET / key
        return path.read_bytes()


def upload_pdf(pdf_data: bytes, consultation_id: str) -> str:
    """Upload un PDF généré. Retourne le chemin/clé."""
    key = f"consultations/{consultation_id}/compte_rendu.pdf"

    if _use_s3():
        client = _get_s3_client()
        client.upload_fileobj(
            io.BytesIO(pdf_data),
            PDF_BUCKET,
            key,
            ExtraArgs={"ContentType": "application/pdf"},
        )
    else:
        path = LOCAL_STORAGE_DIR / PDF_BUCKET / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(pdf_data)

    logger.info("storage.pdf_uploaded", key=key, size=len(pdf_data))
    return key


def get_presigned_url(bucket: str, key: str, expiration: int = 3600) -> str:
    """Génère une URL signée (S3) ou un chemin local."""
    if _use_s3():
        client = _get_s3_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expiration,
        )
    else:
        # En local, on retourne le chemin — le frontend ne pourra pas télécharger directement
        return f"/storage/{bucket}/{key}"
