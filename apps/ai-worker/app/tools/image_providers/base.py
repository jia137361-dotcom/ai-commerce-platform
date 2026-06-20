from __future__ import annotations

from typing import Protocol


class ImageProvider(Protocol):
    async def generate_high_res_image(self, prompt: str, image_size: str) -> str: ...


class ImageGenerationError(RuntimeError):
    pass
