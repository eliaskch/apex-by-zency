"""
APEX by Zency — Backend FastAPI
Point d'entrée principal de l'application.
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import auth

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

    @app.get("/health", tags=["Monitoring"])
    async def health_check() -> dict:
        return {
            "status": "ok",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        }

    @app.get("/db-health", tags=["Monitoring"])
    async def db_health() -> dict:
        from core.database import engine
        import socket
        try:
            host = settings.DATABASE_URL.split("@")[1].split("/")[0].split(":")[0]
            resolved = socket.getaddrinfo(host, 5432, 0, 0, socket.IPPROTO_TCP)
            ips = [r[4][0] for r in resolved]
        except Exception as e:
            ips = [f"DNS ERROR: {e}"]
        try:
            async with engine.connect() as conn:
                from sqlalchemy import text
                result = await conn.execute(text("SELECT version()"))
                pg_version = result.scalar()
            return {"db": "ok", "pg_version": pg_version, "db_url_host": settings.DATABASE_URL.split("@")[1].split("/")[0], "resolved_ips": ips}
        except Exception as e:
            return {"db": "error", "error": str(e), "resolved_ips": ips}

    @app.on_event("startup")
    async def startup_event() -> None:
        logger.info("apex.startup", version=settings.APP_VERSION, env=settings.ENVIRONMENT)

    return app


app = create_app()
