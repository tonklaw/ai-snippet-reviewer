from dataclasses import dataclass


@dataclass
class SyntaxIssue:
    line: int
    col: int
    message: str
