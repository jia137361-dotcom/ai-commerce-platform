from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_effective_settings, get_settings, resolve_image_generation_mode
from app.routes.ai import router as ai_router

logging.basicConfig(level=logging.INFO)
settings = get_effective_settings()
use_mock, mock_reason = resolve_image_generation_mode(settings)
if use_mock:
    logging.getLogger(__name__).warning(
        "AI Worker running in MOCK image mode (%s). Real AI calls are skipped.",
        mock_reason or "AI_WORKER_MOCK_GENERATION=true",
    )

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

mockup_template_path = Path(__file__).resolve().parent / "assets" / "mockup-templates"
if mockup_template_path.is_dir():
    app.mount(
        "/mockup-templates",
        StaticFiles(directory=str(mockup_template_path)),
        name="mockup-templates",
    )

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
def health_check() -> dict[str, str | bool]:
    cfg = get_effective_settings()
    use_mock, mock_reason = resolve_image_generation_mode(cfg)
    return {
        "status": "ok",
        "service": "ai-worker",
        "mock_generation": use_mock,
        "mock_mode_reason": mock_reason or "",
        "image_gen_provider": cfg.image_gen_provider,
        "dashscope_configured": bool(cfg.dashscope_api_key.strip()),
    }


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
