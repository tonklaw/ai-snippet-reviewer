import functools
from typing import Any, Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv(override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    app_env: str = "development"
    log_level: str = "DEBUG"
    cors_origin: list[str] = ["http://localhost:5173"]

    llm_provider: Literal["mock", "litellm"] = "mock"

    # Request limits for POST /lint (413 when exceeded)
    max_code_bytes: int = 20_000
    max_code_lines: int = 500

    llm_models: dict[str, str] = {
        "claude": "anthropic/claude-sonnet-5-5",
        "local": "ollama_chat/qwen2.5-coder:3b",
    }

    llm_model_params: dict[str, dict[str, Any]] = {
        "claude": {"reasoning_effort": "medium"},
        "local": {"temperature": 0},
    }

    llm_timeout_s: float = 120  # local model is slow
    llm_max_tokens: int = 8000
    ollama_api_base: str = "http://localhost:11434"

    cache_backend: Literal["memory", "redis"] = "memory"
    cache_ttl_s: int = 86400  # 24 hours
    redis_url: str = "redis://localhost:6379/0"


@functools.lru_cache
def get_settings() -> Settings:
    return Settings()
