
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings


def create_app():

  app = FastAPI()

  app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
  )

  router = APIRouter(prefix="/api/v1")

  @router.get("/health")
  async def health():
      return {"status": "ok"}

  app.include_router(router)

  return app

app = create_app()