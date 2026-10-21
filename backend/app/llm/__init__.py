from app.config import Settings
from app.llm.base import ProviderReview, ReviewProvider
from app.llm.mock import MockProvider


def build_provider(settings: Settings) -> ReviewProvider:
    if settings.llm_provider == "mock":
        return MockProvider()

    raise NotImplementedError(f"LLM provider {settings.llm_provider!r} is not implemented yet")


__all__ = ["ProviderReview", "ReviewProvider", "build_provider"]
