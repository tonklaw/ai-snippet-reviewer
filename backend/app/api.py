from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.config import Settings, get_settings
from app.llm.models import list_models
from app.review import ReviewService
from app.schema import LintRequest, LintResponse, ModelsResponse

router = APIRouter()


def get_review_service(request: Request) -> ReviewService:
    return request.app.state.review_service


@router.get("/health")
async def health(settings: Annotated[Settings, Depends(get_settings)]):
    return {"status": "ok", "env": settings.app_env}


@router.get("/models", response_model=ModelsResponse)
async def models(settings: Annotated[Settings, Depends(get_settings)]) -> ModelsResponse:
    models = await list_models(settings)
    default = next((m.id for m in models if m.available), None)
    return ModelsResponse(models=models, default=default)


@router.post("/lint", response_model=LintResponse)
async def lint(
    req: LintRequest,
    service: Annotated[ReviewService, Depends(get_review_service)],
) -> LintResponse:
    return await service.lint(req)
