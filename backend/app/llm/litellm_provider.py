import litellm
from pydantic import ValidationError

from app.config import Settings
from app.errors import AppError
from app.llm.base import ProviderReview
from app.llm.models import pick_model
from app.llm.output import ReviewOutput, to_issue
from app.llm.prompt import build_messages
from app.schema import Language, ModelInfo

litellm.suppress_debug_info = True


def strip_fences(text: str) -> str:
    # remove wrapped JSON in ```json ... ```
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    return text.strip()


def keep_indent(fix_code: str, original_line: str) -> str:
    # return indented fix_code to match the original line's indentation,
    # unless the fix_code already starts with whitespace
    if fix_code.startswith((" ", "\t")):
        return fix_code
    indent = original_line[: len(original_line) - len(original_line.lstrip())]
    return "\n".join(indent + line if line.strip() else line for line in fix_code.split("\n"))


class LiteLLMProvider:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def review(self, language: Language, code: str, model: str | None) -> ProviderReview:
        info = await pick_model(self.settings, model)
        messages = build_messages(language, code)

        # One retry: show the model its invalid reply and what was wrong with it
        output = None
        for _ in range(2):
            text = await self._complete(info, messages)
            try:
                output = ReviewOutput.model_validate_json(strip_fences(text))
                break
            except ValidationError as e:
                problem = e.errors()[0]["msg"]
                messages = [
                    *messages,
                    {"role": "assistant", "content": text},
                    {"role": "user", "content": f"Invalid reply: {problem}. Send only the JSON."},
                ]
        if output is None:
            raise AppError(502, "LLM_BAD_RESPONSE", f"{info.id} returned an invalid review")

        lines = code.split("\n")
        issues = []
        for item in output.issues:
            if item.fix and 1 <= item.fix.start_line <= len(lines):
                item.fix.code = keep_indent(item.fix.code, lines[item.fix.start_line - 1])
            issues.append(to_issue(item))
        return ProviderReview(issues=issues, model=info.id)

    async def _complete(self, info: ModelInfo, messages: list[dict]) -> str:
        params = dict(self.settings.llm_model_params.get(info.id, {}))
        if info.model.startswith("ollama"):
            params["api_base"] = self.settings.ollama_api_base

        try:
            res = await litellm.acompletion(
                model=info.model,
                messages=messages,
                response_format=ReviewOutput,
                max_tokens=self.settings.llm_max_tokens,
                timeout=self.settings.llm_timeout_s,
                **params,
            )
        except litellm.Timeout:
            raise AppError(504, "LLM_TIMEOUT", f"{info.id} took too long to answer") from None
        except litellm.AuthenticationError:
            raise AppError(502, "LLM_AUTH_FAILED", f"{info.id}: API key was rejected") from None
        except Exception:
            raise AppError(502, "LLM_ERROR", f"{info.id} failed, try again") from None

        return res.choices[0].message.content or ""
