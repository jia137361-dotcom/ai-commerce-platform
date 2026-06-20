from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from PIL import Image

from app.services.storage import download_bytes

logger = logging.getLogger(__name__)

BUNDLED_DIR = Path(__file__).resolve().parents[1] / "assets" / "mockup-templates"

# Relative print area on bundled flat-lay templates (fraction of image size).
BUNDLED_PLACEMENTS: dict[str, tuple[float, float, float, float]] = {
    "tshirt-front.png": (0.31, 0.30, 0.38, 0.42),
    "tshirt-back.png": (0.31, 0.32, 0.38, 0.40),
    "tshirt-onbody.png": (0.36, 0.44, 0.28, 0.30),
}

PLATFORM_TEMPLATE_KEYS: dict[str, dict[str, str]] = {
    "pp_tshirt": {
        "front": "tshirt-front.png",
        "back": "tshirt-back.png",
        "lifestyle": "tshirt-onbody.png",
    },
    "pp_hoodie": {
        "front": "tshirt-front.png",
        "back": "tshirt-back.png",
        "lifestyle": "tshirt-onbody.png",
    },
    "pp_mug": {
        "front": "tshirt-front.png",
        "back": "tshirt-back.png",
        "lifestyle": "tshirt-onbody.png",
    },
}


def _first_url(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def resolve_mockup_sources(
    *,
    platform_product_id: str | None,
    design_template: dict[str, Any] | None,
    supplier_product: dict[str, Any] | None,
) -> dict[str, str | None]:
    supplier = supplier_product or {}
    template = design_template or {}
    platform_key = (platform_product_id or "pp_tshirt").strip() or "pp_tshirt"
    keys = PLATFORM_TEMPLATE_KEYS.get(platform_key, PLATFORM_TEMPLATE_KEYS["pp_tshirt"])

    supplier_blank = _first_url(
        supplier.get("supplier_mockup_image_url"),
        supplier.get("product_show_master_image"),
    )
    preview_url = _first_url(template.get("preview_background_url"))

    return {
        "platform_product_id": platform_key,
        "supplier_blank_url": supplier_blank,
        "preview_background_url": preview_url,
        "bundled_front": keys["front"],
        "bundled_back": keys["back"],
        "bundled_lifestyle": keys["lifestyle"],
    }


async def load_image_from_url(url: str) -> Image.Image | None:
    try:
        content, _ = await download_bytes(url, timeout=60.0)
        return Image.open(__import__("io").BytesIO(content)).convert("RGBA")
    except Exception as exc:
        logger.warning("Failed to download mockup template %s: %s", url, exc)
        return None


def load_bundled_template(filename: str) -> Image.Image | None:
    path = BUNDLED_DIR / filename
    if not path.is_file():
        logger.warning("Bundled mockup template missing: %s", path)
        return None
    return Image.open(path).convert("RGBA")


def placement_from_design_template(
    design_template: dict[str, Any],
    mockup_size: tuple[int, int],
) -> tuple[int, int, int, int]:
    width, height = mockup_size
    canvas_w = max(int(design_template.get("canvas_width") or width), 1)
    canvas_h = max(int(design_template.get("canvas_height") or height), 1)
    scale_x = width / canvas_w
    scale_y = height / canvas_h
    x = int(float(design_template.get("design_area_x") or 0) * scale_x)
    y = int(float(design_template.get("design_area_y") or 0) * scale_y)
    w = int(float(design_template.get("design_area_width") or width * 0.38) * scale_x)
    h = int(float(design_template.get("design_area_height") or height * 0.40) * scale_y)
    return x, y, w, h


def placement_for_bundled(filename: str, mockup_size: tuple[int, int]) -> tuple[int, int, int, int]:
    width, height = mockup_size
    relx, rely, relw, relh = BUNDLED_PLACEMENTS.get(
        filename, (0.31, 0.30, 0.38, 0.42)
    )
    return (
        int(width * relx),
        int(height * rely),
        int(width * relw),
        int(height * relh),
    )
