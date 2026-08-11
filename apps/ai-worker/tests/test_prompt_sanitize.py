from app.services.prompt_sanitize import build_design_prompt, sanitize_design_prompt


def test_sanitize_removes_tshirt_wording() -> None:
    raw = (
        "A cute fluffy panda sitting inside a white T-shirt, happily eating a bamboo-shaped cake, "
        "kawaii style, bright colors"
    )
    cleaned = sanitize_design_prompt(raw)
    assert "t-shirt" not in cleaned.lower()
    assert "panda" in cleaned.lower()
    assert "bamboo" in cleaned.lower()


def test_build_design_prompt_includes_fulfillment_name() -> None:
    result = build_design_prompt(
        "kawaii panda with cake",
        fulfillment_product_name="Mock Cotton T-shirt",
        request_id="job_test",
    )
    assert "Independent request job_test" in result
    assert "Mock Cotton T-shirt" in result
    assert "Do not reuse" in result
