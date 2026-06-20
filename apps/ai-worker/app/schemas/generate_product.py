from __future__ import annotations

from pydantic import BaseModel, Field


class GenerateProductRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    platform_product_id: str = "pp_tshirt"
    supplier_product_id: str = "sp_tshirt"
    supplier_variant_id: str | None = "spv_tshirt_black_m"
    print_position: str = "front"
    base_cost: float | None = None
    generation_request_id: str | None = None


class SeoPayload(BaseModel):
    title: str
    description: str


class GalleryItem(BaseModel):
    id: str
    label: str
    url: str
    kind: str


class GenerateProductResponse(BaseModel):
    ai_job_id: str
    prompt: str
    artwork_prompt: str | None = None
    visual_prompt: str | None = None
    platform_product_id: str
    supplier_id: str | None = None
    supplier_product_id: str
    supplier_variant_id: str | None = None
    print_position: str
    design_image_url: str
    print_file_url: str
    mockup_image_url: str
    gallery: list[GalleryItem] = Field(default_factory=list)
    title: str
    description: str
    tags: list[str]
    seo: SeoPayload
    price_suggestion: float
    mock_mode: bool = False
