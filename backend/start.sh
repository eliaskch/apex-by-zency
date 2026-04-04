#!/bin/bash
echo "▶ Applying database migrations..."
if alembic upgrade head; then
  echo "✅ Migrations applied"
else
  echo "⚠ Migrations failed — starting anyway for diagnostics"
fi

echo "▶ Starting APEX backend..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
