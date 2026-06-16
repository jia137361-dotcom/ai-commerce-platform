# Buyer Order History API Gap

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Selected Scheme

Batch 8 uses **Scheme C: UI shell only**.

No authenticated buyer order list API is added in this batch.

## Why Email Alone Is Not Enough

An endpoint such as:

```http
GET /store/orders?email=user@example.com
```

would let anyone enumerate all orders for an email address without proving ownership of that mailbox or account. This is weaker than the current guest single-order model.

The existing guest model requires order-specific knowledge:

- `email + display_id` for lookup.
- `order_id + matching email` for detail/tracking.

## Customer Authentication Status

Current project source does not include:

- Buyer registration/login pages wired to backend auth.
- Store customer auth middleware.
- Trusted `req.auth_context` customer identity usage.
- Storefront customer session persistence.
- Signed order-history token/magic link/OTP infrastructure.

## Checkout Customer Binding

Checkout now persists `order.email`, but does not bind orders to a verified logged-in buyer account.

`order.email` is useful for guest single-order lookup and tracking, but must not be used as a standalone identity for full order history.

## Actual Order List API

None added.

Future secure API should be:

```http
GET /store/customers/me/orders
```

Requirements:

- Verified customer session/token.
- `x-publishable-api-key`.
- `X-Store-Id`.
- Current `customer_id` from trusted auth context only.
- Filter orders by `customer_id` and `store_id`.
- Pagination by `limit`/`offset` or cursor.
- Optional status filters.
- No `customer_id` or `email` identity query accepted from frontend.

## Guest vs Authenticated Access

Guest:

- Can lookup one order with `email + display_id`.
- Can view one order detail with `order_id + matching email`.
- Can view tracking with `order_id + matching email`.
- Cannot list all orders by email.

Authenticated customer, future:

- Can list their own orders without exposing email in URL.
- Can view own order detail through customer-auth route.
- Can include `email=null` historical orders only if `customer_id` matches.

## Not Implemented

- Cancellation.
- Refund.
- Return.
- Reorder.
- Invoice download.
- Authenticated order list API.
- Buyer account authentication.
