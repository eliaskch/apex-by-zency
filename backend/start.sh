#!/bin/bash
set -e

echo "▶ Applying database migrations..."
alembic upgrade head

echo "▶ Initializing storage buckets..."
python -c "from core.storage import ensure_buckets; ensure_buckets()" 2>/dev/null || true

WORKERS=${WORKERS:-2}
PORT=${PORT:-8000}

echo "▶ Starting APEX backend (${WORKERS} workers, port ${PORT})..."
exec uvicorn main:app \
    --host 0.0.0.0 \
    --port "${PORT}" \
    --workers "${WORKERS}" \
    --proxy-headers \
    --forwarded-allow-ips="*"
