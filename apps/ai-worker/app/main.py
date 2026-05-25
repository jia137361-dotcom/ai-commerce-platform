from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routes.ai import router as ai_router

logging.basicConfig(level=logging.INFO)
settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_path = settings.upload_path
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(upload_path)), name="static")

app.include_router(ai_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "ai-worker",
        "message": "API only — use /health, /docs, or POST /ai/generate-product",
        "health": "/health",
        "docs": "/docs",
        "generate": "/ai/generate-product",
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "ai-worker"}


def main() -> None:
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.ai_worker_host,
        port=settings.ai_worker_port,
        reload=False,
    )


if __name__ == "__main__":
    main()
