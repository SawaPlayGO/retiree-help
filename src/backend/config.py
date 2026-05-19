from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Основные настройки приложения"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # JWT
    SECRET_KEY: str = "secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 720

    # CORS
    ALLOWED_ORIGINS: str = "*"

    # DB
    POSTGRES_HOST: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_PORT: int
    POSTGRES_DB: str

    S3_ENDPOINT: str
    S3_PORT: int
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET: str
    S3_SECURE: bool = False

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    @computed_field
    @property
    def database_url(self) -> str:
        """Legacy property for backward compatibility"""
        return (
            f"postgresql://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )

    @computed_field
    @property
    def s3_url(self) -> str:
        """
        Builds S3 endpoint URL.
        """
        protocol = "https" if self.S3_SECURE else "http"
        return f"{protocol}://{self.S3_ENDPOINT}:{self.S3_PORT}"


settings = Settings()
