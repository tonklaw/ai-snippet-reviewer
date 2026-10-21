from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import Settings, get_settings
from app.errors import register_error_handlers
from app.llm import build_provider
from app.review import ReviewService


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(title="Mini-AI Code Reviewer")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    app.state.review_service = ReviewService(build_provider(settings), settings)

    app.include_router(router)

    return app


app = create_app()
