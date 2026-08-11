from pathlib import Path

import pytest
from PIL import Image

from app.services.image_processing import _composite_design_on_mockup, normalize_master_artwork
from app.services.mockup_templates import load_bundled_template, resolve_mockup_sources


def test_resolve_mockup_sources_prefers_supplier_blank() -> None:
    sources = resolve_mockup_sources(
        platform_product_id="pp_tshirt",
        design_template={"preview_background_url": "https://example.com/template.png"},
        supplier_product={"supplier_mockup_image_url": "https://example.com/blank.png"},
    )
    assert sources["supplier_blank_url"] == "https://example.com/blank.png"
    assert sources["bundled_front"] == "tshirt-front.png"


def test_composite_design_on_bundled_mockup(tmp_path: Path) -> None:
    base = load_bundled_template("tshirt-front.png")
    assert base is not None

    design = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    for x in range(512):
        for y in range(512):
            if (x - 256) ** 2 + (y - 256) ** 2 < 180**2:
                design.putpixel((x, y), (255, 120, 80, 255))

    design_path = tmp_path / "design.png"
    design.save(design_path)
    master = normalize_master_artwork(design_path)

    placement = (int(base.width * 0.31), int(base.height * 0.30), int(base.width * 0.38), int(base.height * 0.42))
    composed = _composite_design_on_mockup(base, Image.open(master).convert("RGBA"), placement)
    out = tmp_path / "mockup.png"
    composed.save(out)

    assert out.stat().st_size > 10_000
    # Ensure we did not just save the raw artwork square alone.
    assert composed.size == base.size
