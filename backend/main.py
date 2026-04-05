"""
APEX by Zency — Backend FastAPI
Point d'entrée principal de l'application.
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import auth, consultations, patients

logger = structlog.get_logger()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    )

    # CORS — liste stricte, jamais de wildcard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

    # Routers
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(patients.router, prefix="/api/v1")
    app.include_router(consultations.router, prefix="/api/v1")

    @app.get("/health", tags=["Monitoring"])
    async def health_check() -> dict:
        return {
            "status": "ok",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        }


    @app.on_event("startup")
    async def startup_event() -> None:
        logger.info("apex.startup", version=settings.APP_VERSION, env=settings.ENVIRONMENT)
        # Créer les buckets S3 si nécessaire (dev)
        if settings.ENVIRONMENT == "development":
            from core.storage import ensure_buckets
            try:
                ensure_buckets()
            except Exception as e:
                logger.warning("storage.init_error", error=str(e))

    return app


app = create_app()
