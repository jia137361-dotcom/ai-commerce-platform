from __future__ import annotations

import logging
import random
from typing import Any

import httpx

from app.config import Settings
from app.tools.image_providers.base import ImageGenerationError

logger = logging.getLogger(__name__)

SYNC_ENDPOINT = "/api/v1/services/aigc/multimodal-generation/generation"


class DashScopeImageProvider:
    """Alibaba DashScope wan2.7-image-pro (HTTP sync API, not OpenAI /images)."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def generate_high_res_image(self, prompt: str, image_size: str) -> str:
        del image_size
        key = (self._settings.dashscope_api_key or "").strip()
        if not key:
            raise ImageGenerationError("DASHSCOPE_API_KEY is required when IMAGE_GEN_PROVIDER=dashscope")

        base = self._settings.dashscope_base_url.rstrip("/")
        url = f"{base}{SYNC_ENDPOINT}"
        seed = random.randint(1, 2_147_483_647)
        payload = {
            "model": self._settings.dashscope_image_model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt.strip()}],
                    }
                ]
            },
            "parameters": {
                "size": self._settings.dashscope_image_size,
                "n": 1,
                "seed": seed,
                "watermark": self._settings.dashscope_image_watermark,
                "thinking_mode": self._settings.dashscope_image_thinking_mode,
            },
        }
        logger.info(
            "DashScope image request model=%s seed=%s prompt=%s",
            self._settings.dashscope_image_model,
            seed,
            prompt[:240],
        )

        async with httpx.AsyncClient(timeout=self._settings.dashscope_timeout_seconds) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code >= 400:
            logger.error("DashScope image generation failed: %s", response.text)
            raise ImageGenerationError(
                f"DashScope image generation failed HTTP {response.status_code}: {response.text[:300]}"
            )

        data = response.json()
        if data.get("code"):
            raise ImageGenerationError(
                f"DashScope error {data.get('code')}: {data.get('message') or 'unknown'}"
            )

        image_url = _extract_image_url(data)
        if not image_url:
            raise ImageGenerationError(f"DashScope returned no image URL: {data!r}")
        return image_url


def _extract_image_url(data: dict[str, Any]) -> str:
    output = data.get("output") or {}
    choices = output.get("choices") or []
    for choice in choices:
        message = choice.get("message") or {}
        content = message.get("content") or []
        if not isinstance(content, list):
            continue
        for item in content:
            if not isinstance(item, dict):
                continue
            image = str(item.get("image") or "").strip()
            if image:
                return image
    return ""
