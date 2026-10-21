from dataclasses import dataclass
from typing import Protocol

from app.schema import Issue, Language


@dataclass
class ProviderReview:
    issues: list[Issue]
    model: str
    cached: bool = False  # True when the answer came from the cache, not the model


class ReviewProvider(Protocol):
    async def review(self, language: Language, code: str, model: str | None) -> ProviderReview: ...
