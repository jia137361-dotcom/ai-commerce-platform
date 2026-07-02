from __future__ import annotations

from PIL import Image, ImageDraw

from app.tools.image_providers.base import ImageProvider


class MockImageProvider:
    async def generate_high_res_image(self, prompt: str, image_size: str) -> str:
        # Returns a data URL for mock mode when no local persistence is needed upstream.
        del image_size
        img = Image.new("RGBA", (512, 512), (30, 30, 40, 255))
        draw = ImageDraw.Draw(img)
        draw.text((24, 24), prompt[:80], fill=(255, 255, 255, 255))
        import io
        import base64

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        encoded = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/png;base64,{encoded}"
