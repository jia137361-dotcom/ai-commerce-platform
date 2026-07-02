# Buyer Checkout Contact Persistence

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Root Cause

Guest order lookup and tracking correctly require the submitted email to match `order.email`.

The previously verified non-shipping order had:

- `requires_shipping=false`
- `shipping_options=[]`
- `requires_shipping_method=false`
- `order.email=null`

For non-shipping carts, `/checkout` could complete without saving address/contact information. Since contact email was only sent through the address bridge, `cart.email` could remain empty and Medusa completed the order with `order.email=null`.

## Backend Change

Added:

```http
PUT /store/carts/:cart_id/contact
```

Request headers:

```http
x-publishable-api-key: <publishable key>
X-Store-Id: <store id>
Content-Type: application/json
```

Request body:

```json
{
  "email": "buyer@example.com",
  "phone": "+1 555 0100"
}
```

Behavior:

- Requires both publishable key and store id headers.
- Verifies the cart belongs to the current store context.
- Normalizes email with `trim().toLowerCase()`.
- Validates a basic email shape.
- Saves phone into cart metadata as `contact_phone`.
- Tries `updateCartWorkflow` first.
- Falls back to Medusa Cart Module service update if `updateCartWorkflow` fails during cart recalculation.

Response shape:

```json
{
  "cart_id": "cart_...",
  "store_id": "default_store",
  "cart": {
    "id": "cart_...",
    "email": "buyer@example.com",
    "metadata": {
      "store_id": "default_store",
      "contact_phone": "+1 555 0100"
    }
  }
}
```

Also updated:

```http
POST /store/carts/:cart_id/complete
```

It now rejects buyer checkout when `cart.email` is empty or invalid, preventing new guest orders with `order.email=null`.

## Frontend Change

Added API client:

```ts
updateCartContact(cartId, { email, phone })
```

Checkout behavior:

- All carts require a valid contact email before Place Order can run.
- Place Order first calls `updateCartContact`.
- Complete only runs after contact save succeeds.
- `requires_shipping_method=false` carts do not require shipping address.
- `requires_shipping_method=true` carts still require contact save, address save, and shipping method selection.
- Success page still uses only the backend complete response `order.email`; it does not substitute the form email.

`CheckoutContactForm` now shows save states:

- `idle`
- `saving`
- `saved`
- `error`

## Runtime Smoke Result

Smoke date: 2026-06-16

Cart:

```text
cart_01KV7MJ33KVYQF4TZAJX9P3FA8
```

Added line item:

```text
variant_01KTKH18WFHSGH5MXG2YG74PXM
requires_shipping=false
```

Saved contact:

```text
batch65.buyer+smoke@example.com
```

Completed order:

```text
order_id: order_01KV7MNM9RCGWQJVSJ4GAPDKV0
display_id: 63
email: batch65.buyer+smoke@example.com
payment_status: paid
fulfillment_status: waiting
```

Lookup verification:

```http
GET /store/orders/lookup?email=batch65.buyer%2Bsmoke%40example.com&display_id=63
```

Result: HTTP 200 with matching `order_id`, `display_id`, and `email`.

Tracking verification:

```http
GET /store/orders/order_01KV7MNM9RCGWQJVSJ4GAPDKV0/tracking?email=batch65.buyer%2Bsmoke%40example.com
```

Result: HTTP 200. Email validation passed. Response included fulfillment order data and `shipments=[]`.

## Remaining Caveats

- Tracking still has no shipment events until fulfillment/shipment rows exist.
- `updateCartWorkflow` currently fails for an existing line-item cart in this runtime with a price recalculation error; the contact route falls back to Medusa Cart Module service update.
- Shipping-required physical product checkout still needs a separate runtime pass.
