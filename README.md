# Mini-AI Code Reviewer

Paste a code snippet, pick its language, and get the logic errors it contains, with line numbers, an explanation and a suggested fix.

## Requirements

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node 22+ and pnpm
- `make` (optional; the commands it runs are listed in the `Makefile`)

## Local development

```sh
make install                       # uv sync + pnpm install
cp backend/.env.example backend/.env

make backend                       # FastAPI on http://localhost:8000 (API docs at /docs)
make frontend                      # Vite on http://localhost:5173, proxies /api to the backend
```

## Checks

```sh
make test      # backend tests (pytest)
make lint      # ruff + eslint
make format    # ruff autofix + format
```
