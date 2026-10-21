from collections.abc import Callable

from app.schema import Language
from app.syntax.base import SyntaxIssue
from app.syntax.python_ast import check_python_syntax
from app.syntax.treesitter import (
    check_go_syntax,
    check_javascript_syntax,
    check_typescript_syntax,
)

_CHECKERS: dict[Language, Callable[[str], list[SyntaxIssue]]] = {
    Language.PYTHON: check_python_syntax,
    Language.JAVASCRIPT: check_javascript_syntax,
    Language.TYPESCRIPT: check_typescript_syntax,
    Language.GO: check_go_syntax,
}


def check_syntax(code: str, language: Language) -> list[SyntaxIssue]:
    return _CHECKERS[language](code)


__all__ = ["SyntaxIssue", "check_syntax"]
