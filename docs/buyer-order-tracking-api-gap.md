# Buyer Order Tracking API Gap

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Audited APIs

### GET `/store/orders/lookup?email=...&display_id=...`

Current status: ready for email-based guest lookup.

Implementation:

```text
apps/medusa-backend/src/api/store/orders/lookup/route.ts
```

Required request headers:

- `x-publishable-api-key`: required by storefront client/shared store API setup.
- `X-Store-Id`: required to resolve store context and filter orders to the current store.

Request model:

- `email` is required.
- `display_id` is required and must be numeric.
- `order_number` is accepted as an alias for `display_id`.

Store isolation:

- The route lists by `email` and `display_id`.
- It filters matches to `resolveCurrentStore(req).store_id`.
- It also calls `assertOrderBelongsToCurrentStore()` before returning.

Response fields:

- `order_id`
- `display_id`
- `order_number`
- `email`
- `store_id`
- `payment_status`
- `fulfillment_status`
- `created_at`

Important limitation:

- Orders with `email=null` cannot be looked up through this API because `email` is required.
- The Batch 5C verified order `order_01KV7B2G9WTKBG34VSS1N3FJ97` has `email=null`, so it cannot be used for guest email-based lookup.

### GET `/store/orders/:id/tracking?email=...`

Current status: ready but partial.

Implementation:

```text
apps/medusa-backend/src/api/store/orders/[id]/tracking/route.ts
```

Required request headers:

- `x-publishable-api-key`: required by storefront client/shared store API setup.
- `X-Store-Id`: required to resolve store context and enforce store isolation.

Request model:

- URL param `id` is the Medusa order id.
- Query param `email` is required.

Store and ownership checks:

- Route retrieves the order by id.
- It calls `assertOrderBelongsToCurrentStore()`.
- It rejects access when `order.email` is missing or does not match the query email.

Response fields:

- `order_id`
- `store_id`
- `payment_status`
- `fulfillment_status`
- `fulfillment_order`
- `shipments`

Shipment fields, when shipments exist:

- `carrier`
- `tracking_number`
- `tracking_url`
- `shipped_at`
- `delivered_at`
- `status`

Current gaps:

- Response does not include `display_id`.
- Response does not include `email`.
- Response does not include a normalized `status`.
- Response does not include a normalized timeline/events array.
- If no shipment rows exist, carrier/tracking number/tracking URL are absent.
- Orders with `email=null` cannot access tracking because the route explicitly requires matching order email.

## Frontend Decision

Batch 6 must not fabricate tracking numbers or timeline events.

Frontend should display `Not available` for:

- Carrier when `shipments[0].carrier` is missing.
- Tracking number when `shipments[0].tracking_number` is missing.
- Tracking URL when `shipments[0].tracking_url` is missing.
- Timeline when no shipment timestamps/events are returned.
- Display id on tracking page unless it came from lookup navigation/session context.

## Recommended Backend Follow-Up

For Batch 7/order detail or a stronger guest tracking experience:

1. Return `display_id`, `email`, and order status from tracking endpoint.
2. Return normalized `shipments[]`.
3. Return normalized `events[]` / timeline.
4. Decide whether email-null orders should receive a separate secure lookup token. Do not expose email-null orders by id alone.
