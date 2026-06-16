# Buyer Authenticated Orders Audit

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Checkout Customer Binding

Batch 9 added frontend use of Medusa native:

```http
POST /store/carts/:cart_id/customer
```

This route is authenticated by Medusa customer session/bearer middleware and reads the customer actor from auth context. The storefront does not send `customer_id`.

Expected behavior:

- Logged-in checkout calls the route after loading the cart.
- Medusa transfers the authenticated customer to the cart.
- Complete cart should persist `order.customer_id` when the cart has `customer_id`.

Runtime verification is still required for a newly created logged-in checkout order.

## Native Customer Orders Route

Medusa has a native route:

```http
GET /store/orders
```

It authenticates customer session and filters by:

- `customer_id: req.auth_context.actor_id`
- `is_draft_order: false`

However, it does not apply the project's Phase 1 store isolation rule based on `X-Store-Id` and order metadata `store_id`, and it returns native order rows rather than the buyer summary response needed by the storefront.

## Batch 10 Decision

Implemented a project wrapper:

```http
GET /store/customers/me/orders
```

Reasons:

- Keep identity from Medusa auth context.
- Add required `x-publishable-api-key` and `X-Store-Id` checks.
- Filter by `order.customer_id === current customer id`.
- Filter by `order.metadata.store_id === X-Store-Id` with default-store fallback.
- Return a compact buyer-safe summary response.

## Auth Context

Current customer identity is read from:

```ts
req.auth_context.actor_id
```

The TypeScript `MedusaRequest` type does not expose this property, so Batch 10 uses a local type cast helper instead of broad global type augmentation.

## Order Query Strategy

The wrapper calls the Order Module with `customer_id` and optional native `status`, then applies store/payment/fulfillment filters in route code.

Post-query filters:

- store id via `readOrderStoreId(order)`
- `payment_status` via order metadata
- `fulfillment_status` via order metadata helper

Historical guest orders with `customer_id=null` are excluded from authenticated order history.

## Detail / Tracking Access

Existing guest routes are preserved:

- `GET /store/orders/:order_id/detail?email=...`
- `GET /store/orders/:order_id/tracking?email=...`

Batch 10 extends them:

- Authenticated customer may access without `email` if `order.customer_id` matches `req.auth_context.actor_id`.
- If an order has a different `customer_id`, the route returns 403 even if an email query is supplied.
- Guest access still requires matching email.
- `email=null` guest orders remain inaccessible through guest access.

## Historical Guest Orders

Guest orders with `customer_id=null`:

- Do not appear in authenticated order history.
- Remain accessible only through guest single-order lookup/detail/tracking when they have a matching non-null email.
- `email=null` orders remain inaccessible to guest users.
