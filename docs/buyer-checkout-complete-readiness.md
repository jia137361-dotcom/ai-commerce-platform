# Buyer Checkout Complete Readiness

Date: 2026-06-15

Branch: `feature/buyer-frontend-integration`

Scope: Batch 5B audit for `POST /store/carts/:cart_id/complete` and buyer checkout success page.

## Endpoint Status

`POST /store/carts/:cart_id/complete` exists at:

```text
apps/medusa-backend/src/api/store/carts/[id]/complete/route.ts
```

Batch 5B keeps the existing Medusa `completeCartWorkflow` path and adds explicit buyer bridge header validation:

- `x-publishable-api-key` is required.
- `X-Store-Id` is required.
- Existing `assertCartBelongsToCurrentStore()` keeps cart store isolation.

Runtime verification result for this turn: not fully confirmed. The browser reached `/checkout` with a real cart and called the address/shipping bridge, but the in-app browser later blocked further `127.0.0.1:5174` actions. Shell `curl` could not connect to local ports despite `lsof` showing listeners, so a real `POST /store/carts/:cart_id/complete` success response was not captured in this run.

## Complete Preconditions

| Precondition | Status | Evidence / behavior |
| --- | --- | --- |
| Cart must exist | Required | Route retrieves cart by `cartId`; missing cart fails before completion. |
| Cart must belong to current store | Required | `assertCartBelongsToCurrentStore(req, cart)` runs before payment/order completion. |
| Cart must have line items | Required | Route explicitly returns `400` when `cart.items` is empty. |
| Cart email | Required by checkout UI, expected by Medusa order/customer flows | Batch 5A `PUT /store/carts/:cart_id/address` saves `email`; `/checkout` requires valid email before enabling Place Order. |
| Shipping address | Required by checkout UI and expected when items require shipping | Batch 5A address route saves `shipping_address` and mirrored `billing_address`; `/checkout` requires address save before enabling Place Order. |
| Shipping method | Required when shipping options are returned | Batch 5A `GET /shipping-options` returns `requires_shipping_method`; `/checkout` requires selected/saved shipping method when true. Medusa `completeCartWorkflow` also validates shipping for shippable items. |
| Payment collection | Created automatically if missing | `ensureCartPaymentReady()` runs `createPaymentCollectionForCartWorkflow` when needed. |
| Payment session | Created automatically if no processable session exists for provider | `ensureCartPaymentReady()` runs `createPaymentSessionsWorkflow` with default provider `pp_system_default` unless overridden. |
| Local no-payment/manual payment | Available when `pp_system_default` is configured in the local Medusa seed/runtime | Route defaults to `pp_system_default`; if the provider/session cannot be created, complete fails and frontend stays on `/checkout` with the backend error. |

## S2BDIY Trigger Behavior

After a successful complete:

1. The route creates or seeds fulfillment order metadata.
2. If the payment provider does not defer paid status until capture, it marks the order paid and fulfillment waiting.
3. If `getS2bdiyConfig()` returns configured credentials, it attempts `pushOrderToS2bdiy()`.
4. S2BDIY push failures are logged but do not replace the complete response.

This means local buyer demo completion may trigger S2BDIY only when S2BDIY env vars are configured.

## Response Shape

Successful response:

```json
{
  "order_id": "order_...",
  "store_id": "default_store",
  "payment_provider_id": "pp_system_default",
  "payment_status": "paid",
  "fulfillment_status": "waiting",
  "order": {
    "id": "order_...",
    "display_id": 123,
    "email": "buyer@example.com",
    "total": 3295,
    "currency_code": "usd"
  }
}
```

Frontend uses:

- `order_id` / `order.id`
- `order.display_id`
- `order.email`
- `order.total`
- `order.currency_code`

## Frontend Decision

Batch 5B keeps Place Order disabled until a real complete-cart success is verified locally.

The frontend code still encodes these final enablement conditions:

- Cart has line items.
- Contact form is valid.
- Address has been saved successfully.
- Shipping method has been selected and saved, or backend returned `requires_shipping_method=false`.
- Complete endpoint is available.

The final complete readiness flag remains false in `apps/storefront/src/pages/checkout/CheckoutPage.tsx` because this turn did not capture a real successful `POST /store/carts/:cart_id/complete`.

When enabled in a later verification pass, successful completion will:

- Current store cart id is removed from `localStorage` key `citigoo:${storeId}:cart_id`.
- Minimal success data is saved to `sessionStorage` key `citigoo:${storeId}:checkout_success`.
- Browser navigates to `/checkout/success?order_id=...`.

On failure:

- No redirect occurs.
- The error is shown on `/checkout`.
- The failure is logged with `console.error("[checkout] complete cart failed", error)`.

## Remaining Out of Scope

- Order list.
- Order tracking.
- Full buyer order detail API.
- Production payment collection UX.

## Batch 5B Runtime Notes

- Added default sales channel resolution for new buyer carts.
- Added legacy cart repair in the address bridge so carts created before this patch can receive a default sales channel before shipping/complete.
- Browser validation confirmed `/cart` and `/checkout` could load a real cart and that address bridge calls hit the backend.
- Runtime validation did not reach complete-cart success due local browser/curl connectivity constraints in this session.
