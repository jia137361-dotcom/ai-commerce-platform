from __future__ import annotations

from app.tools.image_gen_client import ImageGenClient


class FalImageProvider:
    def __init__(self, client: ImageGenClient | None = None) -> None:
        self._client = client or ImageGenClient()

    async def generate_high_res_image(self, prompt: str, image_size: str) -> str:
        return await self._client.generate_high_res_image(prompt, image_size)
