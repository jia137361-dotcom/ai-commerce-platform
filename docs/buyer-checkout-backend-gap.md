# Buyer Checkout Backend Gap

Date: 2026-06-15

Branch: `feature/buyer-frontend-integration`

Scope: Batch 4 backend capability check for `/checkout`.

## Summary

The backend can read carts and has a cart complete endpoint, but the checkout path is not fully ready for a production buyer UI because address update and shipping method selection APIs are missing. Batch 4 should not call complete by default.

## Capability Matrix

| Capability | Current status | Evidence | Frontend decision |
| --- | --- | --- | --- |
| `GET /store/carts/:cart_id` | Ready | `apps/medusa-backend/src/api/store/carts/[id]/route.ts` retrieves cart with `items`, `shipping_address`, `billing_address`; `apps/storefront/src/lib/buyer-api.ts` has `fetchCart()` | Use in Batch 4 for real cart summary and line items. |
| Cart address update API | Missing | No `apps/medusa-backend/src/api/store/carts/[id]/address/route.ts` or equivalent found | Use local form state only; do not claim address is saved. |
| Shipping options API | Missing | No `shipping-options` store cart route found | Render static shipping shell/pending state only. |
| Shipping method selection API | Missing | No `shipping-methods` store cart route found | Do not mutate cart shipping method. |
| `POST /store/carts/:cart_id/complete` | Exists, but not default-safe for Batch 4 | `apps/medusa-backend/src/api/store/carts/[id]/complete/route.ts` calls `ensureCartPaymentReady()` and Medusa `completeCartWorkflow`; returns `order_id`, `store_id`, `payment_provider_id`, `payment_status`, `fulfillment_status`, and `order` | Can be wrapped as an API function, but do not call from the first-stage checkout shell. |
| Complete response order shape | Partial/opaque | Route returns full native `order` plus top-level statuses; frontend contract is not normalized for success page | Do not build success page in Batch 4. |
| Guest order lookup | Ready but summary-only | `apps/medusa-backend/src/api/store/orders/lookup/route.ts` returns `order_id`, display id, email, store id, payment/fulfillment status, created date | Not used in Batch 4. |
| Order tracking | Ready but partial | `apps/medusa-backend/src/api/store/orders/[id]/tracking/route.ts` requires email and returns fulfillment order plus shipments | Not used in Batch 4. |
| Full order detail | Missing | No `apps/medusa-backend/src/api/store/orders/[id]/route.ts` file found | Required for a later order detail page. |
| Order list | Missing | No `apps/medusa-backend/src/api/store/orders/route.ts` file found | Required for a later account/order list page. |

## Required Backend Follow-Ups

1. Add cart address update route, for example `PUT /store/carts/:cart_id/address`.
2. Add shipping option list route if shipping is required before complete:
   - `GET /store/carts/:cart_id/shipping-options`
3. Add shipping method selection route:
   - `POST /store/carts/:cart_id/shipping-methods`
4. Normalize complete-cart response for frontend success page.
5. Add full order detail API:
   - `GET /store/orders/:order_id`
6. Add buyer order list API:
   - `GET /store/orders`

## Batch 4 Decision

`/checkout` should load and display the real cart, but the primary completion button should be disabled or say `Checkout backend pending`. The frontend must not fake a successful order.
