from __future__ import annotations

import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_MEDUSA_BACKEND_DIR = Path(__file__).resolve().parents[2] / "medusa-backend"
_ENV_FILES = (_MEDUSA_BACKEND_DIR / ".env",)


class Settings(BaseSettings):
    app_name: str = "CitiGoo AI Worker"
    ai_worker_host: str = Field(default="0.0.0.0", validation_alias="AI_WORKER_HOST")
    ai_worker_port: int = Field(default=8001, validation_alias="AI_WORKER_PORT")

    medusa_base_url: str = Field(
        default="http://localhost:9000",
        validation_alias="MEDUSA_BASE_URL",
    )
    publishable_api_key: str = Field(default="", validation_alias="PUBLISHABLE_API_KEY")
    default_store_id: str = Field(default="default_store", validation_alias="DEFAULT_STORE_ID")

    upload_dir: str = Field(default="var/uploads", validation_alias="AI_WORKER_UPLOAD_DIR")
    public_base_url: str = Field(
        default="http://localhost:8001/static",
        validation_alias="AI_WORKER_PUBLIC_BASE_URL",
    )

    fal_key: str = Field(default="", validation_alias="FAL_KEY")
    fal_model: str = Field(default="fal-ai/flux-2-pro", validation_alias="FAL_MODEL")
    fal_upscale_model: str = Field(default="fal-ai/esrgan", validation_alias="FAL_UPSCALE_MODEL")
    fal_timeout_seconds: float = Field(default=360.0, validation_alias="FAL_TIMEOUT_SECONDS")
    fal_upscale_scale: int = Field(default=2, validation_alias="FAL_UPSCALE_SCALE")

    image_gen_provider: str = Field(default="fal", validation_alias="IMAGE_GEN_PROVIDER")
    openai_api_key: str = Field(default="", validation_alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="https://api.openai.com", validation_alias="OPENAI_BASE_URL")
    openai_image_model: str = Field(default="dall-e-3", validation_alias="OPENAI_IMAGE_MODEL")
    openai_image_size: str = Field(default="1024x1024", validation_alias="OPENAI_IMAGE_SIZE")
    openai_timeout_seconds: float = Field(default=120.0, validation_alias="OPENAI_TIMEOUT_SECONDS")

    dashscope_api_key: str = Field(default="", validation_alias="DASHSCOPE_API_KEY")
    dashscope_base_url: str = Field(
        default="https://dashscope.aliyuncs.com",
        validation_alias="DASHSCOPE_BASE_URL",
    )
    dashscope_image_model: str = Field(
        default="wan2.7-image-pro",
        validation_alias="DASHSCOPE_IMAGE_MODEL",
    )
    dashscope_image_size: str = Field(default="2K", validation_alias="DASHSCOPE_IMAGE_SIZE")
    dashscope_image_watermark: bool = Field(default=False, validation_alias="DASHSCOPE_IMAGE_WATERMARK")
    dashscope_image_thinking_mode: bool = Field(
        default=False,
        validation_alias="DASHSCOPE_IMAGE_THINKING_MODE",
    )
    dashscope_timeout_seconds: float = Field(default=180.0, validation_alias="DASHSCOPE_TIMEOUT_SECONDS")
    dashscope_chat_base_url: str = Field(
        default="https://dashscope.aliyuncs.com/compatible-mode/v1",
        validation_alias="DASHSCOPE_CHAT_BASE_URL",
    )
    dashscope_chat_model: str = Field(default="qwen-plus", validation_alias="DASHSCOPE_CHAT_MODEL")

    copy_gen_provider: str = Field(default="deepseek", validation_alias="COPY_GEN_PROVIDER")

    deepseek_api_key: str = Field(default="", validation_alias="DEEPSEEK_API_KEY")
    deepseek_base_url: str = Field(
        default="https://api.deepseek.com",
        validation_alias="DEEPSEEK_BASE_URL",
    )
    deepseek_model: str = Field(default="deepseek-chat", validation_alias="DEEPSEEK_MODEL")
    deepseek_timeout_seconds: float = Field(
        default=60.0,
        validation_alias="DEEPSEEK_TIMEOUT_SECONDS",
    )
    deepseek_max_retries: int = Field(default=2, validation_alias="DEEPSEEK_MAX_RETRIES")

    mock_generation: bool = Field(default=False, validation_alias="AI_WORKER_MOCK_GENERATION")
    price_markup_multiplier: float = Field(
        default=2.5,
        validation_alias="AI_WORKER_PRICE_MARKUP",
    )

    model_config = SettingsConfigDict(
        env_file=[str(p) for p in _ENV_FILES if p.is_file()],
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def upload_path(self) -> Path:
        raw = Path(self.upload_dir)
        return raw if raw.is_absolute() else Path(__file__).resolve().parents[1] / raw

    def ensure_fal_env(self) -> None:
        if self.fal_key and not os.environ.get("FAL_KEY"):
            os.environ["FAL_KEY"] = self.fal_key


def get_settings() -> Settings:
    """Load settings from apps/medusa-backend/.env (re-read each call for dev)."""
    settings = Settings()
    settings.ensure_fal_env()
    if not settings.mock_generation:
        provider = (settings.image_gen_provider or "fal").strip().lower()
        if provider == "openai" and not settings.openai_api_key.strip():
            settings = settings.model_copy(update={"mock_generation": True})
        elif provider == "fal" and not settings.fal_key.strip():
            settings = settings.model_copy(update={"mock_generation": True})
        elif provider == "dashscope" and not settings.dashscope_api_key.strip():
            settings = settings.model_copy(update={"mock_generation": True})
    return settings
