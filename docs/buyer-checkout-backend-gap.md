# Buyer Checkout Backend Gap

Date: 2026-06-15

Branch: `feature/buyer-frontend-integration`

Scope: Batch 5A checkout backend bridge status for `/checkout`.

## Summary

Batch 5A adds the minimum checkout bridge routes for saving delivery address and selecting shipping. The backend can now read carts, update checkout address, list shipping options, select a shipping method, and expose the existing complete endpoint. `/checkout` still should not complete an order by default in this batch because success-page normalization and final complete-order UX are intentionally deferred.

## Capability Matrix

| Capability | Current status | Evidence | Frontend decision |
| --- | --- | --- | --- |
| `GET /store/carts/:cart_id` | Ready | `apps/medusa-backend/src/api/store/carts/[id]/route.ts` retrieves cart with `items`, `shipping_address`, `billing_address`; `apps/storefront/src/lib/buyer-api.ts` has `fetchCart()` | Use for real cart summary and line items. |
| `PUT /store/carts/:cart_id/address` | Ready in Batch 5A | `apps/medusa-backend/src/api/store/carts/[id]/address/route.ts` validates buyer headers, asserts cart store ownership, runs Medusa `updateCartWorkflow`, and returns updated cart | `/checkout` can save contact and delivery address to the cart. |
| `GET /store/carts/:cart_id/shipping-options` | Ready in Batch 5A | `apps/medusa-backend/src/api/store/carts/[id]/shipping-options/route.ts` validates buyer headers, asserts cart store ownership, runs `listShippingOptionsForCartWorkflow`, and returns frontend-friendly option fields | `/checkout` can load selectable shipping options after address save. |
| `POST /store/carts/:cart_id/shipping-methods` | Ready in Batch 5A | `apps/medusa-backend/src/api/store/carts/[id]/shipping-methods/route.ts` validates buyer headers, asserts cart store ownership, runs `addShippingMethodToCartWorkflow`, and returns updated cart | `/checkout` can persist selected shipping method. |
| `POST /store/carts/:cart_id/complete` | Exists, not enabled from UI in Batch 5A | `apps/medusa-backend/src/api/store/carts/[id]/complete/route.ts` calls `ensureCartPaymentReady()` and Medusa `completeCartWorkflow`; returns `order_id`, `store_id`, `payment_provider_id`, `payment_status`, `fulfillment_status`, and `order` | Keep Place Order disabled until Batch 5B wires true completion and success-page handling. |
| Complete response order shape | Partial/opaque | Route returns full native `order` plus top-level statuses; frontend contract is not normalized for success page | Do not build success page in Batch 4. |
| Guest order lookup | Ready but summary-only | `apps/medusa-backend/src/api/store/orders/lookup/route.ts` returns `order_id`, display id, email, store id, payment/fulfillment status, created date | Not used in Batch 4. |
| Order tracking | Ready but partial | `apps/medusa-backend/src/api/store/orders/[id]/tracking/route.ts` requires email and returns fulfillment order plus shipments | Not used in Batch 4. |
| Full order detail | Missing | No `apps/medusa-backend/src/api/store/orders/[id]/route.ts` file found | Required for a later order detail page. |
| Order list | Missing | No `apps/medusa-backend/src/api/store/orders/route.ts` file found | Required for a later account/order list page. |

## Remaining Backend / Contract Follow-Ups

1. Normalize complete-cart response for frontend success page.
2. Confirm local no-payment/manual-payment provider setup is stable enough for buyer demo complete.
3. Add full order detail API:
   - `GET /store/orders/:order_id`
4. Add buyer order list API:
   - `GET /store/orders`

## Batch 5A Decision

`/checkout` can load cart, save address, load shipping options, and select a shipping method. The primary Place Order action remains disabled in Batch 5A because the batch does not implement success-page routing or final order confirmation UX. The frontend must not fake a successful order.
