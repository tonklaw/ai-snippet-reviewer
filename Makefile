.PHONY: install backend frontend test lint format up down logs

install:
	cd backend && uv sync
	cd frontend && pnpm install

backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && pnpm dev

test:
	cd backend && uv run pytest

lint:
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && pnpm lint

format:
	cd backend && uv run ruff check --fix . && uv run ruff format .

up:
	docker compose up --build -d

down:
	docker compose down
