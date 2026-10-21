import ast

from app.syntax.base import SyntaxIssue


def check_python_syntax(code: str) -> list[SyntaxIssue]:
    # Parse only. Never compile/exec: the code is untrusted.
    try:
        ast.parse(code)
    except SyntaxError as e:
        return [
            SyntaxIssue(
                line=e.lineno or 1,
                col=e.offset or 1,
                message=e.msg,
            )
        ]
    except RecursionError:
        # Very deeply nested expressions overflow the AST builder instead of raising SyntaxError.
        return [SyntaxIssue(line=1, col=1, message="Code is nested too deeply to parse")]
    except ValueError as e:
        # Older Pythons raise ValueError for null bytes.
        return [SyntaxIssue(line=1, col=1, message=str(e))]

    return []
