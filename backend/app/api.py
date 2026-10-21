from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.config import Settings, get_settings
from app.review import ReviewService

router = APIRouter()


def get_review_service(request: Request) -> ReviewService:
    return request.app.state.review_service


@router.get("/health")
async def health(settings: Annotated[Settings, Depends(get_settings)]):
    return {"status": "ok", "env": settings.app_env}
