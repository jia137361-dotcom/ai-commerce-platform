from __future__ import annotations

import logging

from app.config import Settings, get_settings
from app.tools.image_providers.base import ImageProvider
from app.tools.image_providers.dashscope_provider import DashScopeImageProvider
from app.tools.image_providers.fal_provider import FalImageProvider
from app.tools.image_providers.mock_provider import MockImageProvider
from app.tools.image_providers.openai_provider import OpenAIImageProvider

logger = logging.getLogger(__name__)


def get_image_provider(settings: Settings | None = None) -> ImageProvider:
    settings = settings or get_settings()
    provider = (settings.image_gen_provider or "fal").strip().lower()

    if settings.mock_generation or provider == "mock":
        return MockImageProvider()

    if provider == "openai":
        if not (settings.openai_api_key or "").strip():
            logger.warning("OPENAI_API_KEY missing; falling back to mock image provider")
            return MockImageProvider()
        return OpenAIImageProvider(settings)

    if provider == "fal":
        if not (settings.fal_key or "").strip():
            logger.warning("FAL_KEY missing; falling back to mock image provider")
            return MockImageProvider()
        return FalImageProvider()

    if provider == "dashscope":
        if not (settings.dashscope_api_key or "").strip():
            logger.warning("DASHSCOPE_API_KEY missing; falling back to mock image provider")
            return MockImageProvider()
        return DashScopeImageProvider(settings)

    logger.warning("Unknown IMAGE_GEN_PROVIDER=%s; falling back to mock", provider)
    return MockImageProvider()
