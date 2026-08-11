from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Literal

from PIL import Image, ImageFilter

from app.services.mockup_templates import (
    load_bundled_template,
    load_image_from_url,
    placement_for_bundled,
    placement_from_design_template,
    resolve_mockup_sources,
)
from app.services.storage import persist_local_file

logger = logging.getLogger(__name__)

ViewKind = Literal["front", "back", "lifestyle"]
PREVIEW_SIZE = 1200


def _open_image(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def normalize_master_artwork(design_path: Path) -> Path:
    """Normalize AI output to a single print artwork file used across all product visuals."""
    artwork = _extract_print_artwork(_open_image(design_path))
    master_tmp = design_path.parent / f"design_master_{design_path.stem}.png"
    artwork.save(master_tmp, format="PNG")
    return master_tmp


def _extract_print_artwork(design: Image.Image) -> Image.Image:
    """Keep full artwork; trim only obvious empty alpha margins."""
    alpha = design.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        return design
    padded = (
        max(0, bbox[0] - 8),
        max(0, bbox[1] - 8),
        min(design.width, bbox[2] + 8),
        min(design.height, bbox[3] + 8),
    )
    cropped = design.crop(padded)
    side = max(cropped.width, cropped.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    offset = ((side - cropped.width) // 2, (side - cropped.height) // 2)
    square.paste(cropped, offset, cropped)
    return square


def _soften_design_edges(design: Image.Image) -> Image.Image:
    if design.mode != "RGBA":
        design = design.convert("RGBA")
    r, g, b, a = design.split()
    a = a.filter(ImageFilter.GaussianBlur(0.8))
    a = a.point(lambda value: int(value * 0.98))
    return Image.merge("RGBA", (r, g, b, a))


def _composite_design_on_mockup(
    base: Image.Image,
    design: Image.Image,
    box: tuple[int, int, int, int],
) -> Image.Image:
    result = base.copy().convert("RGBA")
    x, y, w, h = box
    fitted = _soften_design_edges(design).resize((w, h), Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", result.size, (0, 0, 0, 0))
    overlay.paste(fitted, (x, y), fitted)
    return Image.alpha_composite(result, overlay)


async def _resolve_mockup_base(
    *,
    view: ViewKind,
    mockup_sources: dict[str, str | None],
    design_template: dict[str, Any],
) -> tuple[Image.Image, tuple[int, int, int, int], str]:
    bundled_key = {
        "front": mockup_sources.get("bundled_front"),
        "back": mockup_sources.get("bundled_back"),
        "lifestyle": mockup_sources.get("bundled_lifestyle"),
    }[view]

    remote_candidates: list[tuple[str, str]] = []
    if view == "front":
        if mockup_sources.get("supplier_blank_url"):
            remote_candidates.append(("supplier", mockup_sources["supplier_blank_url"]))
        if mockup_sources.get("preview_background_url"):
            remote_candidates.append(("preview", mockup_sources["preview_background_url"]))
    elif view == "back" and mockup_sources.get("preview_background_url"):
        remote_candidates.append(("preview", mockup_sources["preview_background_url"]))

    # Non-apparel products must never silently fall back to the bundled T-shirt.
    # A supplier-provided blank is a more honest preview even when only one view exists.
    if (
        mockup_sources.get("platform_product_id") not in {"pp_tshirt", "pp_hoodie"}
        and mockup_sources.get("supplier_blank_url")
        and not any(source == "supplier" for source, _ in remote_candidates)
    ):
        remote_candidates.insert(0, ("supplier", mockup_sources["supplier_blank_url"]))

    for source_kind, url in remote_candidates:
        loaded = await load_image_from_url(url)
        if loaded is None:
            continue
        if view == "back" and source_kind == "supplier":
            loaded = loaded.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if source_kind in {"supplier", "preview"}:
            filename = bundled_key or "tshirt-front.png"
            if view == "lifestyle":
                filename = mockup_sources.get("bundled_lifestyle") or "tshirt-onbody.png"
            placement = placement_for_bundled(filename, loaded.size)
        else:
            placement = placement_from_design_template(design_template, loaded.size)
        return loaded, placement, f"{source_kind}:{view}"

    filename = bundled_key or "tshirt-front.png"
    if view == "back":
        filename = mockup_sources.get("bundled_back") or "tshirt-back.png"
    if view == "lifestyle":
        filename = mockup_sources.get("bundled_lifestyle") or "tshirt-onbody.png"
    bundled = load_bundled_template(filename)
    if bundled is None:
        bundled = Image.new("RGBA", (PREVIEW_SIZE, PREVIEW_SIZE), (245, 245, 247, 255))
    placement = placement_for_bundled(filename, bundled.size)
    return bundled, placement, f"bundled:{filename}"


async def _render_mockup_view(
    design_path: Path,
    *,
    design_template: dict[str, Any],
    mockup_sources: dict[str, str | None],
    view: ViewKind,
) -> Path:
    design = _open_image(design_path)
    if view == "back":
        design = design.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    base, placement, source = await _resolve_mockup_base(
        view=view,
        mockup_sources=mockup_sources,
        design_template=design_template,
    )
    logger.info("Mockup view=%s source=%s placement=%s", view, source, placement)
    composed = _composite_design_on_mockup(base, design, placement)

    if composed.size != (PREVIEW_SIZE, PREVIEW_SIZE):
        composed = composed.resize((PREVIEW_SIZE, PREVIEW_SIZE), Image.Resampling.LANCZOS)

    mockup_tmp = design_path.parent / f"mockup_{view}_{design_path.stem}.png"
    composed.save(mockup_tmp, format="PNG")
    return mockup_tmp


async def _render_lifestyle_composite(
    design_path: Path,
    *,
    design_template: dict[str, Any],
    mockup_sources: dict[str, str | None],
) -> Path:
    return await _render_mockup_view(
        design_path,
        design_template=design_template,
        mockup_sources=mockup_sources,
        view="lifestyle",
    )


def _render_print_file(
    design_path: Path,
    *,
    print_spec: dict[str, Any],
    design_template: dict[str, Any],
) -> Path:
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
    return print_tmp


async def export_product_gallery(
    design_path: Path,
    *,
    print_spec: dict[str, Any],
    design_template: dict[str, Any],
    design_image_url: str,
    platform_product_id: str | None = None,
    supplier_product: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    mockup_sources = resolve_mockup_sources(
        platform_product_id=platform_product_id,
        design_template=design_template,
        supplier_product=supplier_product,
    )

    print_tmp = await asyncio.to_thread(
        _render_print_file,
        design_path,
        print_spec=print_spec,
        design_template=design_template,
    )
    _, print_url = await persist_local_file(print_tmp, prefix="print")

    gallery: list[dict[str, str]] = []

    view_specs: list[tuple[str, str, ViewKind]] = [
        ("mockup_front", "Front", "front"),
        ("mockup_back", "Back", "back"),
        ("mockup_lifestyle", "On-body", "lifestyle"),
    ]

    for view_id, label, view_kind in view_specs:
        if view_kind == "lifestyle":
            tmp = await _render_lifestyle_composite(
                design_path,
                design_template=design_template,
                mockup_sources=mockup_sources,
            )
        else:
            tmp = await _render_mockup_view(
                design_path,
                design_template=design_template,
                mockup_sources=mockup_sources,
                view=view_kind,
            )
        _, url = await persist_local_file(tmp, prefix="mockup")
        gallery.append({"id": view_id, "label": label, "url": url, "kind": "mockup"})

    gallery.extend(
        [
            {"id": "design", "label": "Print Artwork", "url": design_image_url, "kind": "design"},
            {"id": "print_file", "label": "Print File", "url": print_url, "kind": "print_file"},
        ]
    )

    return gallery


async def export_print_and_mockup(
    design_path: Path,
    *,
    print_spec: dict[str, Any],
    design_template: dict[str, Any],
    platform_product_id: str | None = None,
    supplier_product: dict[str, Any] | None = None,
) -> tuple[str, str]:
    gallery = await export_product_gallery(
        design_path,
        print_spec=print_spec,
        design_template=design_template,
        design_image_url="",
        platform_product_id=platform_product_id,
        supplier_product=supplier_product,
    )
    print_url = next(item["url"] for item in gallery if item["id"] == "print_file")
    mockup_url = next(item["url"] for item in gallery if item["id"] == "mockup_front")
    return print_url, mockup_url
