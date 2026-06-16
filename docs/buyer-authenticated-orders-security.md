# Buyer Authenticated Orders Security

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Final Model

Authenticated order history uses Medusa customer session identity.

Trusted identity source:

- `req.auth_context.actor_id`

Untrusted identity inputs:

- `email`
- `customer_id`
- localStorage
- sessionStorage
- URL params
- publishable key

## Isolation Rules

`GET /store/customers/me/orders` returns only orders where:

- `order.customer_id === req.auth_context.actor_id`
- `order.metadata.store_id === X-Store-Id` or default-store fallback matches

The route also requires:

- `x-publishable-api-key`
- `X-Store-Id`

## Customer / Store Separation

The route does not accept `customer_id` from query/body. Tests verify that a forged `customer_id` query is ignored and current auth context is used instead.

The route does not accept `email` as list identity, preventing email-based order enumeration.

## Guest Compatibility

Guest single-order flows remain available:

- lookup with `email + display_id`
- detail with `order_id + matching email`
- tracking with `order_id + matching email`

Batch 10 does not weaken guest matching rules.

## Authenticated Detail / Tracking

For orders with `customer_id`:

- matching authenticated customer can access detail/tracking without email query.
- different authenticated customer receives 403.

For guest orders with `customer_id=null`:

- guest email matching remains the access path.
- they do not appear in authenticated order history.

For `email=null` guest orders:

- no guest access.
- authenticated history access only becomes possible if a valid `customer_id` exists and matches the session.

## Tests Added / Updated

Covered:

- unauthenticated list returns 401.
- customer A only sees customer A orders.
- customer A does not see customer B orders.
- store A does not see store B orders.
- forged `customer_id` query is ignored.
- missing publishable key rejected.
- missing `X-Store-Id` rejected.
- pagination over filtered results.
- payment and fulfillment filters.
- native status filter.
- `customer_id=null` guest orders excluded from authenticated list.
- authenticated detail works without email for matching customer.
- authenticated detail rejects customer mismatch.
- guest detail email matching remains covered.

## Known Gaps

- Runtime smoke still needs a fresh logged-in checkout order to confirm `order.customer_id` persists end to end.
- The wrapper currently fetches up to 500 current-customer orders, then applies store/payment/fulfillment filtering in route code. For larger stores, move filtering/pagination into a query/workflow that can filter store metadata safely at the persistence layer.
- No cancellation, refund, return, reorder, or invoice flows.
- No order-list cache or optimistic refresh.
- No account-side order search.
