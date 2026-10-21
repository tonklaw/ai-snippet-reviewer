from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="Mini-AI Code Reviewer")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    router = APIRouter()

    @router.get("/health")
    async def health():
        return {"status": "ok", "env": settings.app_env}

    app.include_router(router)

    return app


app = create_app()
