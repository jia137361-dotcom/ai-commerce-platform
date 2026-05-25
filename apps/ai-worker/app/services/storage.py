from __future__ import annotations

import asyncio
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import httpx

from app.config import get_settings


async def download_bytes(url: str, *, timeout: float = 120.0) -> tuple[bytes, str]:
    if not url.strip():
        raise ValueError("url is required")
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        return response.content, content_type


def _suffix_from_url(url: str, content_type: str) -> str:
    path_suffix = Path(urlparse(url).path).suffix.lower()
    if path_suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        return path_suffix
    if "jpeg" in content_type:
        return ".jpg"
    if "webp" in content_type:
        return ".webp"
    return ".png"


async def persist_remote_image(remote_url: str, *, prefix: str) -> tuple[Path, str]:
    """Download remote image and save under upload_dir; return path and public URL."""
    settings = get_settings()
    upload_dir = settings.upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)

    content, content_type = await download_bytes(remote_url)
    suffix = _suffix_from_url(remote_url, content_type)
    filename = f"{prefix}_{uuid4().hex}{suffix}"
    target = upload_dir / filename
    await asyncio.to_thread(target.write_bytes, content)

    public_url = f"{settings.public_base_url.rstrip('/')}/{filename}"
    return target, public_url


def public_url_for_filename(filename: str) -> str:
    settings = get_settings()
    return f"{settings.public_base_url.rstrip('/')}/{filename}"


async def persist_local_file(source: Path, *, prefix: str, suffix: str = ".png") -> tuple[Path, str]:
    settings = get_settings()
    upload_dir = settings.upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{prefix}_{uuid4().hex}{suffix}"
    target = upload_dir / filename
    content = await asyncio.to_thread(source.read_bytes)
    await asyncio.to_thread(target.write_bytes, content)
    return target, public_url_for_filename(filename)
