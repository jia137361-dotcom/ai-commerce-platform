from __future__ import annotations

import logging

import httpx

from app.config import Settings
from app.tools.image_providers.base import ImageGenerationError

logger = logging.getLogger(__name__)


class OpenAIImageProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def generate_high_res_image(self, prompt: str, image_size: str) -> str:
        del image_size
        key = (self._settings.openai_api_key or "").strip()
        if not key:
            raise ImageGenerationError("OPENAI_API_KEY is required when IMAGE_GEN_PROVIDER=openai")

        model = self._settings.openai_image_model
        size = self._settings.openai_image_size
        url = f"{self._settings.openai_base_url.rstrip('/')}/v1/images/generations"
        payload = {
            "model": model,
            "prompt": prompt.strip(),
            "size": size,
            "n": 1,
        }

        async with httpx.AsyncClient(timeout=self._settings.openai_timeout_seconds) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code >= 400:
            logger.error("OpenAI image generation failed: %s", response.text)
            raise ImageGenerationError(f"OpenAI image generation failed HTTP {response.status_code}")

        data = response.json()
        items = data.get("data") or []
        if not items:
            raise ImageGenerationError("OpenAI image generation returned no data")

        image_url = str(items[0].get("url") or "").strip()
        if not image_url:
            b64 = str(items[0].get("b64_json") or "").strip()
            if b64:
                return f"data:image/png;base64,{b64}"
            raise ImageGenerationError("OpenAI image generation returned no URL")

        return image_url
