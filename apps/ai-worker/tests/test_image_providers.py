from app.tools.image_providers.factory import get_image_provider
from app.tools.image_providers.mock_provider import MockImageProvider
from app.config import Settings


def test_factory_uses_mock_when_mock_generation():
    settings = Settings(
        AI_WORKER_MOCK_GENERATION=True,
        IMAGE_GEN_PROVIDER="fal",
        FAL_KEY="test-key",
    )
    provider = get_image_provider(settings)
    assert isinstance(provider, MockImageProvider)


def test_factory_openai_without_key_falls_back_to_mock():
    settings = Settings(
        AI_WORKER_MOCK_GENERATION=False,
        IMAGE_GEN_PROVIDER="openai",
        OPENAI_API_KEY="",
    )
    provider = get_image_provider(settings)
    assert isinstance(provider, MockImageProvider)
