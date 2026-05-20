from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Literal

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

Role = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class ChatMessage:
    role: Role
    content: str

    def as_payload(self) -> dict[str, str]:
        return {"role": self.role, "content": self.content}


class DeepSeekError(RuntimeError):
    pass


class DeepSeekClient:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
        max_retries: int | None = None,
    ) -> None:
        settings = get_settings()
        self.api_key = (api_key if api_key is not None else settings.deepseek_api_key).strip()
        self.model = model or settings.deepseek_model
        self.base_url = (base_url or settings.deepseek_base_url).rstrip("/")
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else settings.deepseek_timeout_seconds
        )
        self.max_retries = (
            max_retries if max_retries is not None else settings.deepseek_max_retries
        )

    @property
    def chat_completions_url(self) -> str:
        return f"{self.base_url}/chat/completions"

    async def agenerate_text(
        self,
        prompt: str,
        *,
        system_prompt: str = "You output valid JSON only.",
        temperature: float = 0.7,
        max_tokens: int = 1200,
    ) -> str:
        if not self.api_key:
            raise DeepSeekError("DEEPSEEK_API_KEY is not configured")

        payload = {
            "model": self.model,
            "messages": [
                ChatMessage(role="system", content=system_prompt).as_payload(),
                ChatMessage(role="user", content=prompt).as_payload(),
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            for attempt in range(self.max_retries + 1):
                try:
                    response = await client.post(
                        self.chat_completions_url,
                        headers=headers,
                        json=payload,
                    )
                    response.raise_for_status()
                    data = response.json()
                    choices = data.get("choices") or []
                    if not choices:
                        raise DeepSeekError("DeepSeek returned no choices")
                    message = choices[0].get("message") or {}
                    text = str(message.get("content") or "").strip()
                    if not text:
                        raise DeepSeekError("DeepSeek returned empty content")
                    return text
                except (httpx.HTTPError, KeyError, TypeError) as exc:
                    if attempt >= self.max_retries:
                        logger.exception("DeepSeek chat completion failed")
                        raise DeepSeekError(str(exc)) from exc
                    await asyncio.sleep(min(2**attempt, 8))

        raise DeepSeekError("DeepSeek chat completion failed without a response")
