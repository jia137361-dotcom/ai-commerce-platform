from __future__ import annotations

import json
import logging
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageDraw

from app.config import get_effective_settings, get_settings, resolve_image_generation_mode
from app.services.copy_generator import generate_product_copy
from app.services.image_processing import export_product_gallery, normalize_master_artwork
from app.services.medusa_client import MedusaClient, MedusaClientError
from app.services.storage import persist_local_file, persist_remote_image
from app.tools.image_providers import get_image_provider

from app.services.prompt_sanitize import build_design_prompt, sanitize_design_prompt

logger = logging.getLogger(__name__)


async def _mock_design_image(prompt: str, *, width: int, height: int) -> Path:
    settings = get_settings()
    upload_dir = settings.upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)
    w = min(width, 1024)
    h = min(height, 1024)
    img = Image.new("RGBA", (w, h), (255, 248, 240, 255))
    draw = ImageDraw.Draw(img)
    # Brand-orange accent block so mock mode is visibly distinct from failed loads.
    draw.rectangle((w // 8, h // 8, w * 7 // 8, h * 7 // 8), fill=(255, 102, 0, 255))
    draw.rectangle((w // 4, h // 4, w * 3 // 4, h * 3 // 4), fill=(255, 255, 255, 230))
    label = (prompt[:60] + "…") if len(prompt) > 60 else prompt
    draw.text((w // 4 + 12, h // 2 - 24), "Mock AI Design", fill=(30, 30, 40, 255))
    draw.text((w // 4 + 12, h // 2 + 8), label or "preview", fill=(80, 80, 90, 255))
    tmp = upload_dir / f"mock_design_{uuid4().hex}.png"
    img.save(tmp, format="PNG")
    return tmp


async def generate_product_assets(
    *,
    prompt: str,
    platform_product_id: str,
    supplier_product_id: str,
    supplier_variant_id: str | None = None,
    print_position: str = "front",
    base_cost: float | None = None,
    generation_request_id: str | None = None,
) -> dict:
    settings = get_effective_settings()
    use_mock, mock_reason = resolve_image_generation_mode(settings)
    ai_job_id = generation_request_id or f"job_{uuid4().hex[:16]}"

    ctx: dict | None = None
    if not use_mock:
        medusa = MedusaClient()
        supplier_payload: dict | None = None
        try:
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
            logger.warning("Medusa supplier context (filtered) unavailable: %s", exc)

        if ctx is None:
            try:
                supplier_payload = await medusa.fetch_supplier_products()
                ctx = medusa.resolve_supplier_context(
                    supplier_payload,
                    supplier_product_id=supplier_product_id,
                    supplier_variant_id=supplier_variant_id,
                    print_position=print_position,
                )
            except (MedusaClientError, Exception) as exc:
                logger.warning("Medusa supplier context (full catalog) unavailable: %s", exc)

    if ctx is None:
        ctx = {
            "supplier_product": {
                "supplier_id": "sup_citigoo_mock",
                "name": "T-shirt",
                "base_cost": base_cost or 25,
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
        or 25
    )

    image_size = json.dumps(
        {
            "width": int(design_template["design_area_width"]),
            "height": int(design_template["design_area_height"]),
        }
    )

    fulfillment_name = str(supplier_product.get("name") or "Product")
    artwork_prompt = sanitize_design_prompt(prompt)
    visual_prompt = build_design_prompt(
        prompt,
        fulfillment_product_name=fulfillment_name,
        request_id=ai_job_id,
    )
    logger.info(
        "generate_product_assets request=%s user_prompt=%r artwork_prompt=%r",
        ai_job_id,
        prompt[:200],
        artwork_prompt[:200],
    )

    if use_mock:
        logger.warning(
            "AI image generation using mock placeholder (%s)",
            mock_reason or "mock mode",
        )
        raw_design_path = await _mock_design_image(
            artwork_prompt or prompt,
            width=int(design_template["design_area_width"]),
            height=int(design_template["design_area_height"]),
        )
    else:
        provider = get_image_provider(settings)
        image_url = await provider.generate_high_res_image(visual_prompt, image_size)
        raw_design_path, _ = await persist_remote_image(image_url, prefix="design_raw")

    # One canonical artwork drives DIY design, print file, and all mockup views.
    master_path = normalize_master_artwork(raw_design_path)
    _, design_image_url = await persist_local_file(master_path, prefix="design")

    gallery = await export_product_gallery(
        master_path,
        print_spec=print_spec,
        design_template=design_template,
        design_image_url=design_image_url,
        platform_product_id=platform_product_id,
        supplier_product=supplier_product,
    )

    print_file_url = next((item["url"] for item in gallery if item["id"] == "print_file"), "")
    mockup_image_url = next((item["url"] for item in gallery if item["id"] == "mockup_front"), "")

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
        "artwork_prompt": artwork_prompt,
        "visual_prompt": visual_prompt,
        "platform_product_id": platform_product_id,
        "supplier_id": supplier_product.get("supplier_id"),
        "supplier_product_id": supplier_product_id,
        "supplier_variant_id": supplier_variant_id,
        "print_position": print_position,
        "design_image_url": design_image_url,
        "print_file_url": print_file_url,
        "mockup_image_url": mockup_image_url,
        "gallery": gallery,
        "title": copy["title"],
        "description": copy["description"],
        "tags": copy["tags"],
        "seo": copy["seo"],
        "price_suggestion": copy["price_suggestion"],
        "mock_mode": use_mock,
        "mock_mode_reason": mock_reason,
    }
