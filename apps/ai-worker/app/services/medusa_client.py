from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings


class MedusaClientError(RuntimeError):
    pass


class MedusaClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.medusa_base_url.rstrip("/")
        self.publishable_api_key = settings.publishable_api_key.strip()
        self.default_store_id = settings.default_store_id

    def _store_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"X-Store-Id": self.default_store_id}
        if self.publishable_api_key:
            headers["x-publishable-api-key"] = self.publishable_api_key
        return headers

    async def fetch_supplier_products(
        self,
        *,
        platform_product_id: str,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/store/supplier-products"
        params = {"platform_product_id": platform_product_id}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params, headers=self._store_headers())
            if response.status_code >= 400:
                raise MedusaClientError(
                    f"supplier-products failed: {response.status_code} {response.text}"
                )
            return response.json()

    def resolve_supplier_context(
        self,
        payload: dict[str, Any],
        *,
        supplier_product_id: str,
        supplier_variant_id: str | None,
        print_position: str,
    ) -> dict[str, Any]:
        products = payload.get("supplier_products") or []
        product = next(
            (p for p in products if p.get("supplier_product_id") == supplier_product_id),
            None,
        )
        if not product:
            raise MedusaClientError(
                f"supplier_product_id {supplier_product_id} not found in supplier-products response"
            )

        variant = None
        if supplier_variant_id:
            variant = next(
                (
                    v
                    for v in (product.get("variants") or [])
                    if v.get("supplier_variant_id") == supplier_variant_id
                ),
                None,
            )
            if not variant:
                raise MedusaClientError(
                    f"supplier_variant_id {supplier_variant_id} not found"
                )

        print_specs = product.get("print_specs") or []
        print_spec = next(
            (s for s in print_specs if s.get("print_position") == print_position),
            print_specs[0] if print_specs else None,
        )
        if not print_spec:
            raise MedusaClientError("No print spec available for supplier product")

        templates = product.get("design_templates") or []
        design_template = templates[0] if templates else None
        if not design_template:
            raise MedusaClientError("No design template available for supplier product")

        return {
            "supplier_product": product,
            "variant": variant,
            "print_spec": print_spec,
            "design_template": design_template,
        }
