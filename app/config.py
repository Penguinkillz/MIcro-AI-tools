from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    App settings.

    We intentionally use a custom env prefix (QUIZ_) so that any global
    OPENAI_API_KEY on the machine does not interfere with this app.
    """

    # Optional; we now prefer Groq when available.
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="QUIZ_",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

