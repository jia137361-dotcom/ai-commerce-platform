import os

os.environ.setdefault("AI_WORKER_MOCK_GENERATION", "true")

import pytest

from app.schemas.generate_product import GenerateProductRequest
from app.services.generate_product import generate_product_assets


@pytest.mark.asyncio
async def test_generate_product_mock_pipeline() -> None:
    result = await generate_product_assets(
        prompt="minimal geometric cat",
        platform_product_id="pp_tshirt",
        supplier_product_id="sp_tshirt",
        supplier_variant_id="spv_tshirt_black_m",
        print_position="front",
    )
    assert result["design_image_url"]
    assert result["print_file_url"]
    assert result["mockup_image_url"]
    assert result["title"]
    assert result["description"]
    assert result["tags"]
    assert result["price_suggestion"] > 0
    assert result["ai_job_id"].startswith("job_")


@pytest.mark.asyncio
async def test_generate_product_request_schema() -> None:
    body = GenerateProductRequest(prompt="hello")
    assert body.supplier_product_id == "sp_tshirt"
