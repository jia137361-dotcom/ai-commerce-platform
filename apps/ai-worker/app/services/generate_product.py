from __future__ import annotations

import json
import logging
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageDraw

from app.config import get_settings
from app.services.copy_generator import generate_product_copy
from app.services.image_processing import export_print_and_mockup
from app.services.medusa_client import MedusaClient, MedusaClientError
from app.services.storage import persist_local_file, persist_remote_image
from app.tools.image_gen_client import generate_high_res_image

logger = logging.getLogger(__name__)


async def _mock_design_image(prompt: str, *, width: int, height: int) -> tuple[Path, str]:
    settings = get_settings()
    upload_dir = settings.upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGBA", (min(width, 1024), min(height, 1024)), (30, 30, 40, 255))
    draw = ImageDraw.Draw(img)
    draw.text((40, 40), prompt[:80], fill=(255, 255, 255, 255))
    tmp = upload_dir / f"mock_design_{uuid4().hex}.png"
    img.save(tmp, format="PNG")
    _, public_url = await persist_local_file(tmp, prefix="design")
    return tmp, public_url


async def generate_product_assets(
    *,
    prompt: str,
    platform_product_id: str,
    supplier_product_id: str,
    supplier_variant_id: str | None = None,
    print_position: str = "front",
    base_cost: float | None = None,
) -> dict:
    settings = get_settings()
    ai_job_id = f"job_{uuid4().hex[:16]}"

    ctx: dict | None = None
    if not settings.mock_generation:
        try:
            medusa = MedusaClient()
            supplier_payload = await medusa.fetch_supplier_products(
                platform_product_id=platform_product_id
            )
            ctx = medusa.resolve_supplier_context(
                supplier_payload,
                supplier_product_id=supplier_product_id,
                supplier_variant_id=supplier_variant_id,
                print_position=print_position,
            )
        except (MedusaClientError, Exception) as exc:
            logger.warning("Medusa supplier context unavailable: %s", exc)

    if ctx is None:
        ctx = {
            "supplier_product": {
                "supplier_id": "sup_citigoo_mock",
                "name": "T-shirt",
                "base_cost": base_cost or 8.5,
            },
            "variant": {"color": "black", "size": "M"},
            "print_spec": {
                "print_file_width": 4500,
                "print_file_height": 5400,
                "print_position": print_position,
            },
            "design_template": {
                "canvas_width": 4500,
                "canvas_height": 5400,
                "design_area_x": 450,
                "design_area_y": 420,
                "design_area_width": 3600,
                "design_area_height": 4200,
                "preview_background_url": None,
            },
        }

    supplier_product = ctx["supplier_product"]
    variant = ctx.get("variant") or {}
    print_spec = ctx["print_spec"]
    design_template = ctx["design_template"]

    product_base_cost = float(
        base_cost
        if base_cost is not None
        else variant.get("cost")
        or supplier_product.get("base_cost")
        or 8.5
    )

    image_size = json.dumps(
        {
            "width": int(design_template["design_area_width"]),
            "height": int(design_template["design_area_height"]),
        }
    )

    visual_prompt = (
        f"{prompt}. Clean print-ready artwork for apparel, centered composition, "
        "high contrast, no text, no watermark."
    )

    if settings.mock_generation:
        design_path, design_image_url = await _mock_design_image(
            prompt,
            width=int(design_template["design_area_width"]),
            height=int(design_template["design_area_height"]),
        )
    else:
        fal_url = await generate_high_res_image(visual_prompt, image_size)
        design_path, design_image_url = await persist_remote_image(fal_url, prefix="design")

    print_file_url, mockup_image_url = await export_print_and_mockup(
        design_path,
        print_spec=print_spec,
        design_template=design_template,
    )

    copy = await generate_product_copy(
        prompt=prompt,
        product_name=str(supplier_product.get("name") or "Product"),
        base_cost=product_base_cost,
        color=variant.get("color"),
        size=variant.get("size"),
    )

    return {
        "ai_job_id": ai_job_id,
        "prompt": prompt,
        "platform_product_id": platform_product_id,
        "supplier_id": supplier_product.get("supplier_id"),
        "supplier_product_id": supplier_product_id,
        "supplier_variant_id": supplier_variant_id,
        "print_position": print_position,
        "design_image_url": design_image_url,
        "print_file_url": print_file_url,
        "mockup_image_url": mockup_image_url,
        "title": copy["title"],
        "description": copy["description"],
        "tags": copy["tags"],
        "seo": copy["seo"],
        "price_suggestion": copy["price_suggestion"],
        "mock_mode": settings.mock_generation,
    }
