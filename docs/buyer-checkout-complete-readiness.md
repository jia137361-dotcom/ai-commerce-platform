# Buyer Checkout Complete Readiness

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

Scope: Batch 5C runtime-confirmed readiness for `POST /store/carts/:cart_id/complete` and buyer checkout success page.

## Endpoint Status

`POST /store/carts/:cart_id/complete` exists at:

```text
apps/medusa-backend/src/api/store/carts/[id]/complete/route.ts
```

Batch 5B keeps the existing Medusa `completeCartWorkflow` path and adds explicit buyer bridge header validation:

- `x-publishable-api-key` is required.
- `X-Store-Id` is required.
- Existing `assertCartBelongsToCurrentStore()` keeps cart store isolation.

Runtime verification result: confirmed for the non-shipping product path.

- `POST /store/carts/:cart_id/complete` returned HTTP 200.
- `order_id`: `order_01KV7B2G9WTKBG34VSS1N3FJ97`
- `display_id`: `62`
- `payment_provider_id`: `pp_system_default`
- `payment_status`: `paid`
- `fulfillment_status`: `waiting`
- Product shipping requirement: `requires_shipping=false`
- `shipping_options=[]`
- `requires_shipping_method=false`
- `order.email=null`
- `order.shipping_address=null`

## Complete Preconditions

| Precondition | Status | Evidence / behavior |
| --- | --- | --- |
| Cart must exist | Required | Route retrieves cart by `cartId`; missing cart fails before completion. |
| Cart must belong to current store | Required | `assertCartBelongsToCurrentStore(req, cart)` runs before payment/order completion. |
| Cart must have line items | Required | Route explicitly returns `400` when `cart.items` is empty. |
| Cart email | Not required for the verified non-shipping path; expected for shipping/account flows | Batch 5C verified an order with `order.email=null`. `/checkout` must not fake email in success data. |
| Shipping address | Not required when backend returns `requires_shipping_method=false`; required when shipping is needed | Batch 5C verified an order with `order.shipping_address=null` for a non-shipping product. |
| Shipping method | Conditional | If `requires_shipping_method=false`, no shipping option is required and checkout may complete directly. If `requires_shipping_method=true`, `/checkout` requires address saved and shipping method selected. |
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

Batch 5C enables Place Order for the runtime-confirmed non-shipping path.

The frontend code encodes these final enablement conditions:

- Cart has line items.
- Complete endpoint is runtime-confirmed.
- If backend returns `requires_shipping_method=false`, checkout can complete directly without shipping option/address save.
- If backend returns `requires_shipping_method=true`, contact/address must be valid, address must be saved, and shipping method must be selected.

On successful completion:

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
- Batch 5C supersedes the previous incomplete runtime result with a successful non-shipping complete-cart verification.

## Still To Verify

- `requires_shipping=true` physical goods flow.
- Shipping address save plus shipping method selection before complete.
- Success page display when order email and shipping address are present.
