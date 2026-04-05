from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    @property
    def DEBUG(self) -> bool:
        return self.ENVIRONMENT == "development"

    # Database — Render fournit une URL postgresql://, on adapte pour asyncpg
    DATABASE_URL: str = "postgresql+asyncpg://apex:apex@localhost:5432/apex_db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_db_url(cls, v: str) -> str:
        # Normalise vers asyncpg
        for prefix in ("postgresql+psycopg://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+asyncpg://" + v[len(prefix):]
        return v

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # CORS — accepte une chaîne séparée par des virgules ou une liste
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"

    def get_allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # AI APIs
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Storage (S3-compatible)
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_BUCKET: str = "apex-dev"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_REGION: str = "us-east-1"

    # App
    APP_NAME: str = "APEX by Zency"
    APP_VERSION: str = "0.1.0"


settings = Settings()
