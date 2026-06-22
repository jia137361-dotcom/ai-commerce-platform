from __future__ import annotations

import json
import re
from typing import Any

from app.config import get_settings
from app.tools.deepseek_client import DeepSeekClient, DeepSeekError


def _strip_json_fences(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _mock_copy(prompt: str, product_name: str, base_cost: float) -> dict[str, Any]:
    settings = get_settings()
    price = round(max(base_cost * settings.price_markup_multiplier, base_cost + 5), 2)
    title = f"Custom Design — {prompt[:60]}".strip()
    description = (
        f"Custom {product_name} featuring your design: {prompt}. "
        "Made to order using the selected fulfillment product."
    )
    product_tag = product_name.strip().lower() or "product"
    tags = ["custom", "pod", "ai-generated", product_tag]
    return {
        "title": title,
        "description": description,
        "tags": tags,
        "seo": {"title": title[:60], "description": description[:155]},
        "price_suggestion": price,
    }


async def generate_product_copy(
    *,
    prompt: str,
    product_name: str,
    base_cost: float,
    color: str | None,
    size: str | None,
) -> dict[str, Any]:
    settings = get_settings()
    copy_provider = (settings.copy_gen_provider or "deepseek").strip().lower()

    if copy_provider == "dashscope":
        has_key = bool(settings.dashscope_api_key.strip())
    else:
        has_key = bool(settings.deepseek_api_key.strip())

    if settings.mock_generation or not has_key:
        return _mock_copy(prompt, product_name, base_cost)

    variant_bits = []
    if color:
        variant_bits.append(f"color: {color}")
    if size:
        variant_bits.append(f"size: {size}")
    variant_line = ", ".join(variant_bits) if variant_bits else "default variant"

    user_prompt = f"""
Generate ecommerce product copy for a print-on-demand item.

Product: {product_name}
Customer design prompt: {prompt}
Variant: {variant_line}
Supplier base cost (USD): {base_cost}

Output exactly one JSON object with keys:
- title (string, max 120 chars)
- description (string, 200-600 chars, buyer-facing)
- tags (array of 3-8 short strings)
- seo (object with title and description strings)
- price_suggestion (number, USD retail price, typically 2-3x base cost)

Rules:
- English only.
- No markdown fences.
- JSON only.
""".strip()

    if copy_provider == "dashscope":
        client = DeepSeekClient(
            api_key=settings.dashscope_api_key,
            model=settings.dashscope_chat_model,
            base_url=settings.dashscope_chat_base_url,
        )
    else:
        client = DeepSeekClient()
    try:
        raw = await client.agenerate_text(
            user_prompt,
            system_prompt="You are an ecommerce copywriter. Output valid JSON only.",
            temperature=0.75,
            max_tokens=900,
        )
    except DeepSeekError:
        return _mock_copy(prompt, product_name, base_cost)

    try:
        data = json.loads(_strip_json_fences(raw))
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return _mock_copy(prompt, product_name, base_cost)
        data = json.loads(match.group(0))

    title = str(data.get("title") or "").strip()
    description = str(data.get("description") or "").strip()
    tags = data.get("tags") if isinstance(data.get("tags"), list) else []
    seo = data.get("seo") if isinstance(data.get("seo"), dict) else {}
    price_raw = data.get("price_suggestion")
    try:
        price_suggestion = float(price_raw)
    except (TypeError, ValueError):
        price_suggestion = round(base_cost * settings.price_markup_multiplier, 2)

    if not title or not description:
        return _mock_copy(prompt, product_name, base_cost)

    return {
        "title": title,
        "description": description,
        "tags": [str(t) for t in tags][:12],
        "seo": {
            "title": str(seo.get("title") or title)[:120],
            "description": str(seo.get("description") or description)[:320],
        },
        "price_suggestion": max(price_suggestion, base_cost),
    }
