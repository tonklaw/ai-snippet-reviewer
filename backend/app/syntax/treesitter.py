import tree_sitter_go
import tree_sitter_javascript
import tree_sitter_typescript
from tree_sitter import Language as TSLanguage
from tree_sitter import Node, Parser

from app.syntax.base import SyntaxIssue

MAX_ISSUES = 10
SNIPPET_CHARS = 20

# Loading grammars is the expensive part, so do it once. Parsers are cheap and
# not thread-safe, so each call creates its own.
GO_LANGUAGE = TSLanguage(tree_sitter_go.language())
JAVASCRIPT_LANGUAGE = TSLanguage(tree_sitter_javascript.language())
TYPESCRIPT_LANGUAGE = TSLanguage(tree_sitter_typescript.language_typescript())
TSX_LANGUAGE = TSLanguage(tree_sitter_typescript.language_tsx())


def _parse(code: str, language: TSLanguage) -> Node:
    return Parser(language).parse(code.encode("utf-8")).root_node


def _char_col(lines: list[str], row: int, byte_col: int) -> int:
    """Tree-sitter columns are UTF-8 byte offsets; convert to a 1-based character column."""
    if row >= len(lines):
        return byte_col + 1
    prefix = lines[row].encode("utf-8")[:byte_col]
    return len(prefix.decode("utf-8", errors="ignore")) + 1


def _snippet(node: Node) -> str:
    text = (node.text or b"").decode("utf-8", errors="replace").strip()
    first_line = text.split("\n", 1)[0]
    return first_line[:SNIPPET_CHARS]


def _collect_errors(root: Node, code: str) -> list[SyntaxIssue]:
    lines = code.split("\n")
    issues: list[SyntaxIssue] = []
    # Iterative walk: deeply nested input must not hit Python's recursion limit.
    stack = [root]

    while stack and len(issues) < MAX_ISSUES:
        node = stack.pop()
        row, byte_col = node.start_point

        if node.is_missing:
            message = f"Missing '{node.type}'"
        elif node.is_error:
            snippet = _snippet(node)
            message = f"Unexpected syntax near '{snippet}'" if snippet else "Unexpected syntax"
        else:
            if node.has_error:
                # Reversed so children are visited in source order.
                stack.extend(reversed(node.children))
            continue

        issues.append(
            SyntaxIssue(line=row + 1, col=_char_col(lines, row, byte_col), message=message)
        )

    return issues


def check_go_syntax(code: str) -> list[SyntaxIssue]:
    return _collect_errors(_parse(code, GO_LANGUAGE), code)


def check_javascript_syntax(code: str) -> list[SyntaxIssue]:
    # The JavaScript grammar already understands JSX.
    return _collect_errors(_parse(code, JAVASCRIPT_LANGUAGE), code)


def check_typescript_syntax(code: str) -> list[SyntaxIssue]:
    # `<number>x` only parses as TS and `<div />` only as TSX, so accept either.
    issues = _collect_errors(_parse(code, TYPESCRIPT_LANGUAGE), code)
    if issues and not _collect_errors(_parse(code, TSX_LANGUAGE), code):
        return []
    return issues
