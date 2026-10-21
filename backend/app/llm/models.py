import time

import httpx2
import litellm

from app.config import Settings
from app.errors import AppError
from app.schema import ModelInfo

CACHE_SECONDS = 60
_cache: dict = {"at": 0.0, "models": []}


async def _ollama_models(base_url: str) -> set[str] | None:
    try:
        async with httpx2.AsyncClient(timeout=2) as client:
            res = await client.get(f"{base_url}/api/tags")
            res.raise_for_status()
    except httpx2.HTTPError:
        return None
    return {m["name"] for m in res.json().get("models", [])}


def _ollama_name(model: str) -> str:
    name = model.split("/", 1)[1]
    return name if ":" in name else f"{name}:latest"


async def list_models(settings: Settings) -> list[ModelInfo]:
    if time.monotonic() - _cache["at"] < CACHE_SECONDS:
        return _cache["models"]

    pulled = None
    if any(m.startswith("ollama") for m in settings.llm_models.values()):
        pulled = await _ollama_models(settings.ollama_api_base)

    models = []
    for alias, model in settings.llm_models.items():
        reason = None
        if model.startswith("ollama"):
            if pulled is None:
                reason = "Ollama is not running"
            elif _ollama_name(model) not in pulled:
                reason = f"Model not pulled: run `ollama pull {_ollama_name(model)}`"
        else:
            missing = litellm.validate_environment(model)["missing_keys"]
            if missing:
                reason = f"Missing {', '.join(missing)}"
        models.append(ModelInfo(id=alias, model=model, available=reason is None, reason=reason))

    _cache.update(at=time.monotonic(), models=models)
    return models


async def pick_model(settings: Settings, alias: str | None) -> ModelInfo:
    models = await list_models(settings)

    if alias is None:
        for m in models:
            if m.available:
                return m
        raise AppError(
            503, "NO_MODEL_AVAILABLE", "No model available. Add an API key or start Ollama"
        )

    for m in models:
        if m.id == alias:
            if not m.available:
                raise AppError(503, "MODEL_UNAVAILABLE", f"{alias}: {m.reason}")
            return m
    raise AppError(400, "UNKNOWN_MODEL", f"Unknown model {alias!r}")
