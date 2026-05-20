from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Mapping
from typing import Any

try:
    import fal_client
except ImportError:  # pragma: no cover
    fal_client = None  # type: ignore[assignment]

from app.config import get_settings

logger = logging.getLogger(__name__)

BASE_IMAGE_ENDPOINT = "fal-ai/flux-2-pro"
UPSCALE_ENDPOINT = "fal-ai/esrgan"
DEFAULT_TIMEOUT_SECONDS = 360.0
DEFAULT_START_TIMEOUT_SECONDS = 60.0


class ImageGenerationError(RuntimeError):
    pass


class ImageGenClient:
    def __init__(
        self,
        *,
        timeout_seconds: float | None = None,
        start_timeout_seconds: float = DEFAULT_START_TIMEOUT_SECONDS,
        upscale_scale: int | None = None,
        client: Any | None = None,
    ) -> None:
        settings = get_settings()
        timeout_seconds = timeout_seconds if timeout_seconds is not None else settings.fal_timeout_seconds
        upscale_scale = upscale_scale if upscale_scale is not None else settings.fal_upscale_scale
        if upscale_scale not in {2, 4}:
            raise ValueError("upscale_scale must be 2 or 4")

        self.timeout_seconds = timeout_seconds
        self.start_timeout_seconds = start_timeout_seconds
        self.upscale_scale = upscale_scale
        self.client = client or _build_fal_async_client(timeout_seconds)

    async def generate_high_res_image(self, prompt: str, image_size: str) -> str:
        prompt = prompt.strip()
        image_size = image_size.strip()
        if not prompt:
            raise ValueError("prompt is required")
        if not image_size:
            raise ValueError("image_size is required")

        async with asyncio.timeout(self.timeout_seconds):
            base_image_url = await self._generate_base_image(prompt, image_size)
            if not base_image_url:
                raise ImageGenerationError("Base image generation returned an empty URL")
            final_image_url = await self._upscale_image(base_image_url)
            if not final_image_url:
                raise ImageGenerationError("ESRGAN upscaling returned an empty URL")
            return final_image_url

    async def _generate_base_image(self, prompt: str, image_size: str) -> str:
        size = _parse_image_size(image_size)
        result = await self.client.subscribe(
            BASE_IMAGE_ENDPOINT,
            arguments={
                "prompt": prompt,
                "image_size": size,
                "num_images": 1,
                "num_inference_steps": 28,
                "guidance_scale": 3.5,
                "enable_safety_checker": True,
                "output_format": "png",
            },
            with_logs=True,
            start_timeout=self.start_timeout_seconds,
            client_timeout=self.timeout_seconds,
        )
        if _has_nsfw_concept(result):
            raise ImageGenerationError("Base image generation was blocked by safety checks")
        image_url = _extract_flux_image_url(result)
        if not image_url:
            raise ImageGenerationError(f"Base image generation returned no URL: {result!r}")
        return image_url

    async def _upscale_image(self, image_url: str) -> str:
        result = await self.client.subscribe(
            UPSCALE_ENDPOINT,
            arguments={
                "image_url": image_url,
                "scale": self.upscale_scale,
                "model": "RealESRGAN_x4plus",
                "output_format": "png",
            },
            with_logs=True,
            start_timeout=self.start_timeout_seconds,
            client_timeout=self.timeout_seconds,
        )
        final_url = _extract_esrgan_image_url(result)
        if not final_url:
            raise ImageGenerationError(f"ESRGAN upscaling returned no URL: {result!r}")
        return final_url


async def generate_high_res_image(prompt: str, image_size: str) -> str:
    client = ImageGenClient()
    return await client.generate_high_res_image(prompt, image_size)


def _parse_image_size(image_size: str) -> str | dict[str, int]:
    stripped = image_size.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, dict) and "width" in parsed and "height" in parsed:
                return {"width": int(parsed["width"]), "height": int(parsed["height"])}
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    return image_size


def _build_fal_async_client(timeout_seconds: float) -> Any:
    if fal_client is None:
        raise RuntimeError("fal-client is not installed. pip install fal-client")
    settings = get_settings()
    key = (settings.fal_key or "").strip()
    return fal_client.AsyncClient(default_timeout=timeout_seconds, key=key if key else None)


def _extract_flux_image_url(result: Mapping[str, Any]) -> str:
    images = result.get("images") or []
    if not isinstance(images, list) or not images:
        return ""
    first_image = images[0]
    if not isinstance(first_image, Mapping):
        return ""
    return str(first_image.get("url") or "").strip()


def _extract_esrgan_image_url(result: Mapping[str, Any]) -> str:
    image = result.get("image") or {}
    if not isinstance(image, Mapping):
        return ""
    return str(image.get("url") or "").strip()


def _has_nsfw_concept(result: Mapping[str, Any]) -> bool:
    flags = result.get("has_nsfw_concepts") or []
    if not isinstance(flags, list):
        return False
    return any(bool(flag) for flag in flags)
