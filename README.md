# Mini-AI Code Reviewer

Paste a code snippet, pick its language, and get the logic errors it contains, with line numbers, an explanation and a suggested fix.

### Language Support

- Python
- JavaScript
- TypeScript
- Go

### AI Model

- Claude (Anthropic Console)
- Ollama (Local)

## Quick start (Docker)

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/). For the local model also [Ollama](https://ollama.com), for Claude an [Anthropic API key](https://console.anthropic.com).

```sh
cp backend/.env.example backend/.env   # then put your key in ANTHROPIC_API_KEY
ollama pull qwen2.5-coder:3b           # or optionally use the local model

make up                                # or: docker compose up --build -d
```

Open **http://localhost:8080**. Stop it with `make down`.

This starts three containers: the frontend (nginx), the backend (FastAPI) and Redis for cache. 

## Local development

Needs Python 3.12+ with [uv](https://docs.astral.sh/uv/), Node 22+ with pnpm, and `make` (optional)

```sh
make install                           # uv sync + pnpm install
cp backend/.env.example backend/.env

make backend                           # FastAPI on http://localhost:8000, API docs at /docs
make frontend                          # Vite on http://localhost:5173
```

With `LLM_PROVIDER=mock` no AI is needed: a few regex rules stand in for the model, which is useful for local development.

| Command | What it does |
|---|---|
| `make lint` | ruff + eslint |
| `make format` | ruff autofix + format |
| `make up` / `make down` | Docker stack on port 8080 |
| `make frontend` / `make backend` | Starts Frontend/ Backend locally

## Configuration

All settings live in `backend/.env` (see `.env.example`).

Configuring model require changes in `backend/app/config.py`. Adding another model may require additional env var such as `OPENAI_API_KEY`.

## Architecture

```
flowchart TD
  Frontend["Frontend<br/>React + Redux"]

  Frontend --> Backend

  subgraph Backend["FastAPI backend"]

    subgraph Lint["POST /lint"]
      Validate["1. Validate<br/>supported language, size limits"]
      Syntax["2. Syntax check<br/>tree-sitter (local)"]
      Cache["3. Cache lookup<br/>In-memory or Redis"]
      Prompt["4. Prompt building"]
      Gateway["4. Gateway call"]
      Return["5. Validate JSON reply<br/>fix indentation, store in cache"]

      Validate --> Syntax
      Syntax -->|no errors<br/>or forced review| Cache
      Cache -->|miss| Prompt
      Prompt --> Gateway
      Gateway --> Return
      Return -.-> |Retry once when inccorect format| Gateway
    end

    subgraph Models["GET /models<br/>Check model availability"]
      Validate2["1. Validate available models"]
      Return2["2. Return model list"]

      Validate2 --> Return2
    end

    LiteLLM["LiteLLM<br/> AI Gateway"]
    Gateway <--> LiteLLM
    Validate2 <--> LiteLLM
  end
  

  LiteLLM <--> Providers["Claude / Ollama / any provider"]

  Syntax -.->|errors: return them, no AI call| Resp(["Response"])
  Cache -.->|hit| Resp
  Return --> Resp
  Return2 --> Resp
```

**Syntax check.** Python uses the standard library's `ast` parser, Go/JavaScript/TypeScript use [tree-sitter](https://tree-sitter.github.io/). It only parses, never runs the code. Broken code would make the model report syntax problems as "logic errors" and waste a call, so it stops here unless **Force review** is checked.

**Prompt and response.** The prompt (`backend/app/llm/prompt.py`):

- asks for logic errors only, and explicitly not style, naming or performance
- says to return `{"issues": []}` for correct code, so the model doesn't invent problems
- prefixes every code line with its number (`  5 | ...`) to reduce hallucination
- wants a concrete failing input in each explanation, and fixes that replace exactly the reported lines
- treats the code as data: instructions hidden in comments or strings are ignored

The model must answer in a fixed JSON shape (`backend/app/llm/output.py`), enforced with a JSON schema. The backend validates it; on bad JSON the model gets one retry with the error. If indentation drp[[ed]] in fixes, the backend also restores it from the original line for proper replacement.

**Models.** Everything goes through [LiteLLM](https://github.com/BerriAI/litellm), so any provider it supports works by config. `GET /models` checks each configured model: API keys are needed for cloud models, Ollama models need Ollama running and the model pulled.

**Cache.** The key is a hash of prompt version, model, its settings, language and the code. Only validated reviews are stored (no errors or bad replies).

**Frontend.** State lives in one Redux Toolkit slice (`frontend/src/store.ts`): a review is a thunk that can be cancelled, and late answers from a replaced review are ignored. **Fix** finds the fix's target lines by their text, so it still works after editing lines above them or applied another fix. Code, language, model and Force review are saved in `localStorage`.

## API

The backend's routes have no prefix (`/lint`); through the frontend they're under `/api/v1` (`http://localhost:8080/api/v1/lint`).

### **`POST /lint`**

#### Request

```json
{ "language": "python", "code": "def average(xs):\n    ...", "model": "claude", "forceReview": false }
```

`language` is `python`, `javascript`, `typescript` or `go`. 

`model` and `forceReview` are optional (default: first available model, run the syntax check).

#### Response

```json
{
    "issues": [
        {
            "kind": "logic",
            "startLine": 5,
            "endLine": 5,
            "severity": "high",
            "title": "Average has stray subtraction and no empty-list handling",
            "description": "The function returns total / len(xs) - 1, so the result is always one less than the true average. For xs=[2,4,6] it returns 3.0 instead of 4.0. An empty list also raises ZeroDivisionError.",
            "fix": { "code": "    return total / len(xs) if xs else 0", "startLine": 5, "endLine": 5 }
        }
    ],
    "summary": "1 logic error found.",
    "metadata": { "stage": "review", "model": "claude", "durationMs": 5112, "cached": false }
}
```

`kind` is `syntax` when the syntax check stopped the review (`metadata.stage` is then `syntax` and `model` is `null`).

### **`GET /models`**

#### Response

```json
{
    "models": [
        {
            "id": "claude",
            "model": "anthropic/claude-sonnet-5-5",
            "available": true,
            "reason": null
        },
        {
            "id": "local",
            "model": "ollama_chat/qwen2.5-coder:3b",
            "available": true,
            "reason": null
        }
    ],
    "default": "claude"
}
```

### **`GET /health`**

#### Response

```json
{"status": "ok", "env": "development"}
```

### Errors

Errors always look like `{"error": {"code": "...", "message": "..."}}`:

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR`, `EMPTY_CODE`, `UNKNOWN_MODEL` | bad request |
| 413 | `CODE_TOO_LARGE` | too much characters or line limit |
| 503 | `MODEL_UNAVAILABLE`, `NO_MODEL_AVAILABLE` | missing API key, Ollama not running |
| 502 | `LLM_ERROR`, `LLM_AUTH_FAILED`, `LLM_BAD_RESPONSE` | the model call failed |
| 504 | `LLM_TIMEOUT` | the model took longer than `LLM_TIMEOUT_S` |
