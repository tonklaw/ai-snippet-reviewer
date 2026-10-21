import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

from app.llm.base import ProviderReview
from app.schema import Fix, Issue, Language

PY = {Language.PYTHON}
JS_TS = {Language.JAVASCRIPT, Language.TYPESCRIPT}
GO = {Language.GO}


@dataclass(frozen=True)
class Rule:
    languages: set[Language]
    pattern: re.Pattern[str]
    title: str
    description: str
    severity: Literal["high", "medium", "low"]
    fix: Callable[[str], str]


def _sub(pattern: re.Pattern[str], repl: str) -> Callable[[str], str]:
    return lambda line: pattern.sub(repl, line)


# Canned, regex-based "reviews" so the UI and tests have realistic data without an AI model.
# AI-Generated as idea for static mock testing

_PY_RANGE = re.compile(r"range\(len\((?P<seq>[^()]+)\)\s*\+\s*1\)")
_PY_MUTABLE_DEFAULT = re.compile(r"(?P<name>\w+)\s*=\s*(\[\]|\{\}|set\(\))(?=\s*[,)])")
_JS_LENGTH_LE = re.compile(r"<=\s*(?P<arr>[\w.]+)\.length")
_JS_LOOSE_EQ = re.compile(r"(?<![=!<>])(?P<op>[!=])=(?!=)")
_GO_LEN_LE = re.compile(r"<=\s*len\((?P<seq>[^()]+)\)")

RULES = [
    Rule(
        PY,
        _PY_RANGE,
        "Off-by-one: loop runs past the last index",
        "`range(len(x) + 1)` yields one index too many, so the last iteration "
        "reads `x[len(x)]` and raises IndexError.",
        "high",
        _sub(_PY_RANGE, r"range(len(\g<seq>))"),
    ),
    Rule(
        PY,
        re.compile(r"^\s*def\s+\w+\(.*" + _PY_MUTABLE_DEFAULT.pattern),
        "Mutable default argument",
        "Default values are evaluated once, so every call shares the same list/dict "
        "and changes leak between calls. Default to None and create it inside the function.",
        "medium",
        _sub(_PY_MUTABLE_DEFAULT, r"\g<name>=None"),
    ),
    Rule(
        JS_TS,
        _JS_LENGTH_LE,
        "Off-by-one: loop runs past the last index",
        "`i <= arr.length` runs once more than there are elements, so the last "
        "iteration reads `arr[arr.length]`, which is undefined.",
        "high",
        _sub(_JS_LENGTH_LE, r"< \g<arr>.length"),
    ),
    Rule(
        JS_TS,
        _JS_LOOSE_EQ,
        "Loose equality comparison",
        "`==` converts types before comparing (`0 == ''` and `null == undefined` are true), "
        "which can take the wrong branch. Use strict equality.",
        "medium",
        _sub(_JS_LOOSE_EQ, r"\g<op>=="),
    ),
    Rule(
        GO,
        _GO_LEN_LE,
        "Off-by-one: loop runs past the last index",
        "`i <= len(s)` runs once more than there are elements, so `s[len(s)]` "
        "panics with index out of range.",
        "high",
        _sub(_GO_LEN_LE, r"< len(\g<seq>)"),
    ),
]


class MockProvider:
    async def review(self, language: Language, code: str, model: str | None) -> ProviderReview:
        issues: list[Issue] = []
        for line_no, line in enumerate(code.split("\n"), start=1):
            for rule in RULES:
                if language in rule.languages and rule.pattern.search(line):
                    issues.append(
                        Issue(
                            kind="logic",
                            start_line=line_no,
                            end_line=line_no,
                            severity=rule.severity,
                            title=rule.title,
                            description=rule.description,
                            fix=Fix(code=rule.fix(line), start_line=line_no, end_line=line_no),
                        )
                    )
        return ProviderReview(issues=issues, model="mock")
