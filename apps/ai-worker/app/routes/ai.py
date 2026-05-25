from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.generate_product import GenerateProductRequest, GenerateProductResponse, SeoPayload
from app.services.generate_product import generate_product_assets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-product", response_model=GenerateProductResponse)
async def generate_product(body: GenerateProductRequest) -> GenerateProductResponse:
    try:
        result = await generate_product_assets(
            prompt=body.prompt.strip(),
            platform_product_id=body.platform_product_id,
            supplier_product_id=body.supplier_product_id,
            supplier_variant_id=body.supplier_variant_id,
            print_position=body.print_position,
            base_cost=body.base_cost,
        )
    except Exception as exc:
        logger.exception("generate-product failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    seo = result.get("seo") or {}
    return GenerateProductResponse(
        ai_job_id=result["ai_job_id"],
        prompt=result["prompt"],
        platform_product_id=result["platform_product_id"],
        supplier_id=result.get("supplier_id"),
        supplier_product_id=result["supplier_product_id"],
        supplier_variant_id=result.get("supplier_variant_id"),
        print_position=result["print_position"],
        design_image_url=result["design_image_url"],
        print_file_url=result["print_file_url"],
        mockup_image_url=result["mockup_image_url"],
        title=result["title"],
        description=result["description"],
        tags=result["tags"],
        seo=SeoPayload(
            title=str(seo.get("title") or result["title"]),
            description=str(seo.get("description") or result["description"]),
        ),
        price_suggestion=float(result["price_suggestion"]),
        mock_mode=bool(result.get("mock_mode")),
    )
