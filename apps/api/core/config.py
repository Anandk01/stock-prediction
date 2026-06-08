from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JWT
    SECRET_KEY: str = Field(default="dev_secret_fallback_only", env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days

    # Google OAuth
    GOOGLE_CLIENT_ID: str | None = Field(default=None, env="GOOGLE_CLIENT_ID")

    # Tesseract (optional)
    TESSERACT_CMD_PATH: str | None = None

    # Storage Paths
    MODEL_STORAGE_PATH: str = "data/models"

    class Config:
        env_file = ".env"


settings = Settings()
