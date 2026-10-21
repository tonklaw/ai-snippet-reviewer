from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict
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
