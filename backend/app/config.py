import functools
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    app_env: str = "development"
    log_level: str = "DEBUG"
    cors_origin: list[str] = ["*"]

    llm_provider: Literal["mock", "litellm"] = "mock"

    # Request limits for POST /lint (413 when exceeded)
    max_code_bytes: int = 20_000
    max_code_lines: int = 500


@functools.lru_cache
def get_settings() -> Settings:
    return Settings()
