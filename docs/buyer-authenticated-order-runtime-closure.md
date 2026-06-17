# Buyer Authenticated Order Runtime Closure

This note closes the Batch 10 runtime gap for authenticated buyer order history.

## Root Cause

The order was created during `POST /store/carts/:cart_id/complete`; the success page and View Order button were not responsible for order persistence.

The incomplete runtime path was:

1. Checkout loaded the cart and attempted customer binding as a best-effort side effect.
2. Place Order saved contact and completed the cart, but did not require a fresh successful customer binding immediately before complete.
3. If Medusa complete did not carry `cart.customer_id` onto `order.customer_id`, the authenticated list route correctly returned no orders because it only lists orders owned by `req.auth_context.actor_id`.
4. Authenticated order history also depends on stable store isolation via `order.metadata.store_id`.

## Corrected Runtime Chain

Authenticated Place Order now requires:

1. Current buyer session is loaded and authenticated.
2. `POST /store/carts/:cart_id/customer` succeeds.
3. Returned cart has `customer_id === current customer id`.
4. Contact email is saved to the cart.
5. `POST /store/carts/:cart_id/complete` is called once.
6. Complete response includes the real `order_id`, `cart_customer_id`, and `order_customer_id`.
7. The completed cart id is cleared from localStorage, while checkout success keeps the order id/display id summary in sessionStorage.

`View Order` only navigates to `/account/orders/:order_id` for authenticated users. It does not call cart binding, complete, or any persistence API.

## Backend Rules

`POST /store/carts/:cart_id/complete`:

- keeps publishable key and `X-Store-Id` checks.
- keeps cart store ownership checks.
- when `req.auth_context.actor_id` is present, rejects complete unless `cart.customer_id` matches that actor.
- after complete, verifies order customer ownership.
- if Medusa returns an order with missing `customer_id` while the trusted cart has one, the bridge writes `order.customer_id` from the server-side cart customer.
- writes `metadata.store_id` during post-complete metadata initialization.

`GET /store/customers/me/orders`:

- reads identity only from `req.auth_context.actor_id`.
- filters by current customer and current store.
- returns `{ orders, count, limit, offset }`.
- logs raw, store-filtered, and returned counts in non-production runtime for local closure debugging.

## Frontend Rules

`/checkout`:

- Place Order is disabled until the buyer is signed in.
- Place Order is disabled while submitting.
- customer binding is executed immediately before complete.
- complete is not called if binding fails or returns a different customer id.

`/checkout/success`:

- authenticated View Order links to `/account/orders/:order_id`.
- guest links keep the existing matching-email model.
- no auth token or email is placed in the authenticated order-detail URL.

`/account/orders`:

- calls `GET /store/customers/me/orders` with `credentials: "include"`.
- renders only the stable `orders` array from the response.
- shows empty state only when the authenticated response has no orders.

## Remaining Runtime Check

## Runtime Diagnostic Update

Read-only database inspection for `sijingtamctsy@gmail.com` found:

- current customer id: `cus_01KV87SPMAA4BMW0ZVEX21J7V4`
- recent orders: display ids `64`, `65`, `66`, `67`, `68`
- each inspected order has `customer_id = cus_01KV87SPMAA4BMW0ZVEX21J7V4`
- each inspected order has `metadata.store_id = default_store`

That rules out the two original likely ownership causes for these orders:

- the orders are not email-only records.
- the orders are not missing `metadata.store_id`.

The runtime failure was the authenticated order list read path:

- the Order Module `listOrders({ customer_id })` selector returned 5 rows.
- the returned DTO shape did not expose ownership through top-level `customer_id`.
- route code checked only `order.customer_id === auth_customer_id`, so `customer_matched_count` became `0`.
- `relations: ["customer"]` is invalid in this Medusa Order Module; `Order` has no `customer` populate relation.
- the route now treats the trusted server-side `customer_id` selector as ownership provenance.
- if a DTO does include `customer_id`, it must either match the actor id or the row is filtered out.
- if a DTO omits `customer_id`, the row is retained because ownership was already enforced by the trusted selector.
- email is still diagnostic-only and is never used as authenticated ownership fallback.

The order list route now logs development-only counts:

- `auth_customer_id`
- `requested_store_id`
- `query_source`
- `raw_query_selector`
- `raw_order_count`
- `customer_matched_count`
- `store_matched_count`
- `returned_count`
- `returned_order_ids`
- `same_email_unowned_store_order_count`
- `first_order_shape`

It also falls back to Medusa Query graph with the same trusted `customer_id` selector if the Order Module returns no rows. Both Order Module and Query graph results use the same query-provenance rule. This fallback does not accept frontend `customer_id` or `email` and does not list email-only guest orders.

Expected fixed runtime counts for this user:

- `raw_order_count: 5`
- `customer_matched_count: 5`
- `store_matched_count: 5`
- `returned_count: 5`

The required local smoke remains:

1. Log in buyer.
2. Create clean cart.
3. Add `variant_01KTKH18WFHSGH5MXG2YG74PXM`.
4. Place Order.
5. Confirm cart customer binding is 2xx.
6. Confirm complete is 2xx and called once.
7. Do not click View Order.
8. Open `/account/orders`.
9. Confirm the new order appears.
10. Open authenticated detail without email query.
