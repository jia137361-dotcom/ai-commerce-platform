# Testing Notes

## Store Isolation Smoke Script

Run the local smoke test with:

```bash
export BASE_URL="http://localhost:9000"
export PUBLISHABLE_API_KEY="<publishable_api_key>"
export ADMIN_TOKEN="<admin_bearer_token>"
export DEFAULT_STORE_ID="default_store"
export TEST_STORE_ID="test_store"

bash scripts/smoke-store-isolation.sh
```

Required tools:

- `curl`
- `jq`

Required environment variables:

- `PUBLISHABLE_API_KEY`: Medusa Store API publishable key.
- `ADMIN_TOKEN`: bearer token for Admin API requests.

Optional bridge variables:

- `DEFAULT_MEDUSA_PRODUCT_ID`
- `DEFAULT_MEDUSA_VARIANT_ID`
- `TEST_MEDUSA_PRODUCT_ID`
- `TEST_MEDUSA_VARIANT_ID`

The script always runs store-context, category, product, publish, and cross-store negative checks. Product-to-cart bridge checks run only when both `DEFAULT_MEDUSA_VARIANT_ID` and `TEST_MEDUSA_VARIANT_ID` are provided. Those values must be real native Medusa variants that are valid for local cart operations.

## Bridge Coverage

The bridge tests verify:

- Storefront products expose `medusa_variant_id` and `is_cart_addable`.
- Cart line-items can be added by `product_id` when the custom product is published and linked.
- Cart line-items can still be added by direct `variant_id` when the variant reverse-checks to a published linked `mc_product`.
- Cross-store cart adds return `CART_STORE_MISMATCH`.

## Current Limitations

- The backend does not automatically create native Medusa products or variants.
- The seed script does not create publishable API keys.
- Bridge tests need pre-existing native Medusa variants or another local setup step that creates them.
