from app.tools.image_providers.dashscope_provider import _extract_image_url
from app.tools.image_providers.factory import get_image_provider
from app.tools.image_providers.mock_provider import MockImageProvider
from app.tools.image_providers.dashscope_provider import DashScopeImageProvider
from app.config import Settings


def test_extract_image_url_from_dashscope_response():
    data = {
        "output": {
            "choices": [
                {
                    "message": {
                        "content": [
                            {"type": "image", "image": "https://example.com/out.png"}
                        ]
                    }
                }
            ]
        }
    }
    assert _extract_image_url(data) == "https://example.com/out.png"


def test_factory_dashscope_provider():
    settings = Settings(
        AI_WORKER_MOCK_GENERATION=False,
        IMAGE_GEN_PROVIDER="dashscope",
        DASHSCOPE_API_KEY="sk-test",
    )
    provider = get_image_provider(settings)
    assert isinstance(provider, DashScopeImageProvider)


def test_factory_dashscope_without_key_falls_back_to_mock():
    settings = Settings(
        AI_WORKER_MOCK_GENERATION=False,
        IMAGE_GEN_PROVIDER="dashscope",
        DASHSCOPE_API_KEY="",
    )
    provider = get_image_provider(settings)
    assert isinstance(provider, MockImageProvider)
