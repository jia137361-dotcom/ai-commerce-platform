from __future__ import annotations

import asyncio
import logging
from io import BytesIO
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageDraw

from app.services.storage import persist_local_file

logger = logging.getLogger(__name__)


def _open_image(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def _load_background_sync(
    preview_background_url: str | None,
    *,
    width: int,
    height: int,
) -> Image.Image:
    if preview_background_url:
        try:
            with httpx.Client(timeout=60.0, follow_redirects=True) as client:
                response = client.get(preview_background_url)
                if response.status_code < 400:
                    return Image.open(BytesIO(response.content)).convert("RGBA").resize(
                        (width, height),
                        Image.Resampling.LANCZOS,
                    )
        except Exception:
            logger.warning("Failed to load preview background; using placeholder", exc_info=True)

    img = Image.new("RGBA", (width, height), (240, 240, 240, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [width // 4, height // 3, 3 * width // 4, 2 * height // 3],
        fill=(200, 200, 200, 255),
    )
    return img


def _render_print_and_mockup(
    design_path: Path,
    *,
    print_spec: dict[str, Any],
    design_template: dict[str, Any],
) -> tuple[Path, Path]:
    canvas_w = int(print_spec["print_file_width"])
    canvas_h = int(print_spec["print_file_height"])
    area_x = int(design_template["design_area_x"])
    area_y = int(design_template["design_area_y"])
    area_w = int(design_template["design_area_width"])
    area_h = int(design_template["design_area_height"])

    design = _open_image(design_path)
    fitted = design.resize((area_w, area_h), Image.Resampling.LANCZOS)

    print_canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    print_canvas.paste(fitted, (area_x, area_y), fitted)
    print_tmp = design_path.parent / f"print_{design_path.stem}.png"
    print_canvas.save(print_tmp, format="PNG")

    mock_w = int(design_template["canvas_width"])
    mock_h = int(design_template["canvas_height"])
    base = _load_background_sync(
        design_template.get("preview_background_url"),
        width=mock_w,
        height=mock_h,
    )
    mock_fitted = design.resize((area_w, area_h), Image.Resampling.LANCZOS)
    base.paste(mock_fitted, (area_x, area_y), mock_fitted)
    mockup_tmp = design_path.parent / f"mockup_{design_path.stem}.png"
    base.save(mockup_tmp, format="PNG")
    return print_tmp, mockup_tmp


async def export_print_and_mockup(
    design_path: Path,
    *,
    print_spec: dict[str, Any],
    design_template: dict[str, Any],
) -> tuple[str, str]:
    print_tmp, mockup_tmp = await asyncio.to_thread(
        _render_print_and_mockup,
        design_path,
        print_spec=print_spec,
        design_template=design_template,
    )
    _, print_url = await persist_local_file(print_tmp, prefix="print")
    _, mockup_url = await persist_local_file(mockup_tmp, prefix="mockup")
    return print_url, mockup_url
