import time

from app.config import Settings
from app.errors import AppError
from app.llm import ReviewProvider
from app.schema import Issue, LintMetadata, LintRequest, LintResponse
from app.syntax import SyntaxIssue, check_syntax


def normalize_code(code: str) -> str:
    return code.replace("\r\n", "\n").replace("\r", "\n")


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


def _syntax_to_issue(issue: SyntaxIssue) -> Issue:
    return Issue(
        kind="syntax",
        start_line=issue.line,
        end_line=issue.line,
        severity="high",
        title="Syntax error",
        description=f"Column {issue.col}: {issue.message}",
    )


def _sanitize(issues: list[Issue], line_count: int) -> list[Issue]:
    kept: list[Issue] = []
    for issue in issues:
        start = min(max(issue.start_line, 1), line_count)
        if issue.kind == "logic" and not 1 <= issue.start_line <= line_count:
            continue
        end = min(max(issue.end_line, start), line_count)
        kept.append(issue.model_copy(update={"start_line": start, "end_line": end}))
    return sorted(kept, key=lambda i: (i.start_line, i.end_line))


class ReviewService:
    def __init__(self, provider: ReviewProvider, settings: Settings):
        self.provider = provider
        self.settings = settings

    def _check_limits(self, code: str, line_count: int) -> None:
        if not code.strip():
            raise AppError(400, "EMPTY_CODE", "Code is empty")
        size = len(code.encode("utf-8"))
        if size > self.settings.max_code_bytes:
            raise AppError(
                413,
                "CODE_TOO_LARGE",
                f"Code is {size} bytes; the limit is {self.settings.max_code_bytes}",
            )
        if line_count > self.settings.max_code_lines:
            raise AppError(
                413,
                "CODE_TOO_LARGE",
                f"Code has {line_count} lines; the limit is {self.settings.max_code_lines}",
            )

    async def lint(self, req: LintRequest) -> LintResponse:
        started = time.perf_counter()
        code = normalize_code(req.code)
        line_count = len(code.rstrip("\n").split("\n"))
        self._check_limits(code, line_count)

        syntax_issues = check_syntax(code, req.language)
        if syntax_issues and not req.force_review:
            issues = _sanitize([_syntax_to_issue(s) for s in syntax_issues], line_count)
            return LintResponse(
                issues=issues,
                summary=f"{_plural(len(issues), 'syntax error')} found. "
                "Fix them or request a review anyway.",
                metadata=LintMetadata(
                    stage="syntax",
                    model=None,
                    duration_ms=_elapsed_ms(started),
                    cached=False,
                ),
            )

        review = await self.provider.review(req.language, code, req.model)
        issues = _sanitize(review.issues, line_count)
        summary = (
            f"{_plural(len(issues), 'logic error')} found." if issues else "No logic errors found."
        )
        return LintResponse(
            issues=issues,
            summary=summary,
            metadata=LintMetadata(
                stage="review",
                model=review.model,
                duration_ms=_elapsed_ms(started),
                cached=review.cached,
            ),
        )


def _elapsed_ms(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)
