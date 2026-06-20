from __future__ import annotations

import re

# User prompt should describe artwork only — garment type comes from fulfillment base.
_GARMENT_PHRASES = re.compile(
    r"\b("
    r"t-?shirts?|tee-?shirts?|hoodies?|mugs?|posters?|canvas|phone cases?|"
    r"apparel|clothing|garments?|mockups?|mannequins?|"
    r"wearing|inside a|on a shirt|printed on|"
    r"white shirt|black shirt|crew-?neck"
    r")\b",
    re.IGNORECASE,
)

_INSIDE_GARMENT = re.compile(
    r"\b(sitting|standing|inside|within|on)\s+(a\s+)?(white|black|green|blue|red\s+)?"
    r"(t-?shirt|tee|hoodie|garment)\b",
    re.IGNORECASE,
)


def sanitize_design_prompt(prompt: str) -> str:
    """Strip garment/mockup wording so AI generates flat print artwork only."""
    text = prompt.strip()
    if not text:
        return text

    text = _INSIDE_GARMENT.sub("", text)
    text = _GARMENT_PHRASES.sub("", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"^[\s,.\-]+|[\s,.\-]+$", "", text)
    return text or prompt.strip()


def build_design_prompt(
    user_prompt: str,
    *,
    fulfillment_product_name: str | None = None,
    request_id: str | None = None,
) -> str:
    artwork = sanitize_design_prompt(user_prompt)
    req = f"Independent request {request_id}. " if request_id else ""
    product = f" for {fulfillment_product_name}" if fulfillment_product_name else ""
    return (
        f"{req}Create a brand-new isolated print artwork{product}. "
        f"Subject and style: {artwork}. "
        "Single flat graphic only, one centered illustration on plain background. "
        "Do not reuse or remix characters from other requests. "
        "No t-shirt, no mockup, no mannequin, no collage, no split panels, no multiple views, "
        "no text, no watermark."
    )
