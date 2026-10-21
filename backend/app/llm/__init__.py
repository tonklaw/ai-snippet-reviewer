from app.config import Settings
from app.llm.base import ProviderReview, ReviewProvider
from app.llm.litellm_provider import LiteLLMProvider
from app.llm.mock import MockProvider


def build_provider(settings: Settings) -> ReviewProvider:
    if settings.llm_provider == "litellm":
        return LiteLLMProvider(settings)
    return MockProvider()


__all__ = ["ProviderReview", "ReviewProvider", "build_provider"]
