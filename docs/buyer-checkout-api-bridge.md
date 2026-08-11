# Buyer Checkout API Bridge

Date: 2026-06-15

Branch: `feature/buyer-frontend-integration`

Scope: Batch 5A checkout bridge between the buyer `/checkout` page and Medusa cart APIs.

## Added APIs

### PUT `/store/carts/:cart_id/address`

Purpose: save buyer contact and delivery address onto the existing cart before shipping selection.

Required headers:

```http
x-publishable-api-key: <publishable_api_key>
X-Store-Id: default_store
Content-Type: application/json
```

Request:

```json
{
  "email": "buyer@example.com",
  "phone": "+15550100",
  "shipping_address": {
    "first_name": "Buyer",
    "last_name": "Demo",
    "address_1": "123 Main St",
    "address_2": "Apt 4",
    "city": "Los Angeles",
    "province": "CA",
    "postal_code": "90007",
    "country_code": "us"
  }
}
```

Response:

```json
{
  "cart_id": "cart_...",
  "store_id": "default_store",
  "cart": {}
}
```

Implementation notes:

- The route asserts cart ownership through existing store-isolation helper.
- `body.store_id` is not accepted.
- Billing address is mirrored from shipping address for the buyer demo.

### GET `/store/carts/:cart_id/shipping-options`

Purpose: return shipping options available for the cart after an address is saved.

Response:

```json
{
  "cart_id": "cart_...",
  "store_id": "default_store",
  "shipping_options": [
    {
      "id": "so_...",
      "name": "Standard Shipping",
      "amount": 500,
      "currency_code": "usd"
    }
  ],
  "requires_shipping_method": true
}
```

If no options are returned, the frontend treats shipping as not selectable and keeps final order completion disabled until Batch 5B confirms the complete workflow.

### POST `/store/carts/:cart_id/shipping-methods`

Purpose: persist the selected shipping option onto the cart.

Request:

```json
{
  "option_id": "so_..."
}
```

Response:

```json
{
  "cart_id": "cart_...",
  "store_id": "default_store",
  "cart": {}
}
```

## Frontend API Client

Added to `apps/storefront/src/lib/buyer-api.ts`:

- `updateCartAddress(cartId, input)`
- `getCartShippingOptions(cartId)`
- `selectCartShippingMethod(cartId, optionId)`

Existing:

- `completeCart(cartId, paymentProviderId?)`

## Place Order Status

Place Order remains disabled in Batch 5A.

Current enablement conditions encoded in `/checkout`:

- Cart has line items.
- Contact form has basic email, phone, and name.
- Address form has country, city, postal code, and street address.
- Address was saved to backend cart.
- Shipping method was selected and saved when shipping options are required.
- Complete-order endpoint is confirmed for the success-page flow.

The final condition is deliberately false in Batch 5A. Batch 5B should turn it on only after complete-cart behavior and success-page routing are verified.

## Remaining Gaps

- Success page is not implemented.
- Full order detail API is missing.
- Buyer order list API is missing.
- Order tracking is intentionally out of scope.
- Complete-cart local no-payment/manual-payment flow still needs an end-to-end verification before UI enables Place Order.

## Local Curl Checks

Use real local values without committing keys:

```bash
export MEDUSA_URL="http://127.0.0.1:9000"
export PUBLISHABLE_KEY="<publishable_api_key>"
export STORE_ID="default_store"
export CART_ID="<cart_id_from_localStorage>"
```

Update address:

```bash
curl -X PUT "$MEDUSA_URL/store/carts/$CART_ID/address" \
  -H "x-publishable-api-key: $PUBLISHABLE_KEY" \
  -H "X-Store-Id: $STORE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "phone": "+15550100",
    "shipping_address": {
      "first_name": "Buyer",
      "last_name": "Demo",
      "address_1": "123 Main St",
      "city": "Los Angeles",
      "province": "CA",
      "postal_code": "90007",
      "country_code": "us"
    }
  }'
```

List shipping options:

```bash
curl "$MEDUSA_URL/store/carts/$CART_ID/shipping-options" \
  -H "x-publishable-api-key: $PUBLISHABLE_KEY" \
  -H "X-Store-Id: $STORE_ID"
```

Select shipping method:

```bash
export SHIPPING_OPTION_ID="<shipping_option_id>"

curl -X POST "$MEDUSA_URL/store/carts/$CART_ID/shipping-methods" \
  -H "x-publishable-api-key: $PUBLISHABLE_KEY" \
  -H "X-Store-Id: $STORE_ID" \
  -H "Content-Type: application/json" \
  -d "{\"option_id\":\"$SHIPPING_OPTION_ID\"}"
```
