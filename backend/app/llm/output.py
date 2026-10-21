from typing import Literal

from pydantic import BaseModel

from app.schema import Fix, Issue


class LlmFix(BaseModel):
    code: str
    start_line: int
    end_line: int


class LlmIssue(BaseModel):
    start_line: int
    end_line: int
    severity: Literal["high", "medium", "low"]
    title: str
    explanation: str
    fix: LlmFix | None


class ReviewOutput(BaseModel):
    issues: list[LlmIssue]


def to_issue(item: LlmIssue) -> Issue:
    fix = None
    if item.fix:
        fix = Fix(code=item.fix.code, start_line=item.fix.start_line, end_line=item.fix.end_line)
    return Issue(
        kind="logic",
        start_line=item.start_line,
        end_line=item.end_line,
        severity=item.severity,
        title=item.title,
        description=item.explanation,
        fix=fix,
    )
