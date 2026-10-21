from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Language(StrEnum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    GO = "go"


class Fix(ApiModel):
    code: str
    start_line: int
    end_line: int


class Issue(ApiModel):
    kind: Literal["syntax", "logic"]
    start_line: int
    end_line: int
    severity: Literal["high", "medium", "low"]
    title: str
    description: str
    fix: Fix | None = None


class LintRequest(ApiModel):
    language: Language
    code: str = Field(min_length=1)
    model: str | None = None
    force_review: bool = False


class LintMetadata(ApiModel):
    stage: Literal["syntax", "review"]
    # None when the syntax gate stopped the request before any model ran
    model: str | None
    duration_ms: int
    cached: bool


class LintResponse(ApiModel):
    issues: list[Issue]
    summary: str
    metadata: LintMetadata


class ModelInfo(ApiModel):
    id: str  # alias shown in the UI, e.g. "claude"
    model: str  # LiteLLM model string
    available: bool
    reason: str | None = None  # why it's unavailable


class ModelsResponse(ApiModel):
    models: list[ModelInfo]
    default: str | None
