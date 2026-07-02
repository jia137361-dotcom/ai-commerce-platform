# Buyer Auth Architecture

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Decision

Batch 9 uses **Medusa native customer email/password auth with an HttpOnly session cookie**.

The storefront does not implement password storage, password hashing, token signing, or customer identity itself. It calls Medusa native auth/customer routes and treats the backend session as the only trusted customer identity.

## Native Capabilities Found

- Customer email/password auth provider routes exist under Medusa:
  - `POST /auth/customer/emailpass/register`
  - `POST /auth/customer/emailpass`
- Session route exists:
  - `POST /auth/session`
  - `DELETE /auth/session`
- Store customer routes exist:
  - `POST /store/customers`
  - `GET /store/customers/me`
  - `POST /store/customers/me`
- Native authenticated cart-customer binding exists:
  - `POST /store/carts/:cart_id/customer`
  - The route reads the authenticated customer actor from Medusa auth context.

## Session Strategy

Selected strategy: **HttpOnly cookie session**.

Flow:

1. Register or login through Medusa emailpass auth.
2. Medusa returns a short-lived auth token.
3. The storefront immediately calls `POST /auth/session` with `Authorization: Bearer <token>`.
4. Medusa sets the session cookie.
5. The storefront discards the bearer token and uses `credentials: "include"` for subsequent requests.
6. `GET /store/customers/me` is the source of truth for the current customer.

The bearer token is only used in-memory for the session creation request. It is not stored in localStorage, sessionStorage, a URL, console output, or docs.

## Required Headers

Storefront business routes continue to send:

- `x-publishable-api-key`
- `X-Store-Id`

Authenticated customer routes additionally rely on:

- Medusa session cookie, sent by `credentials: "include"`

## Customer Identity Propagation

Customer identity must come from Medusa auth/session middleware and backend auth context.

Allowed:

- `GET /store/customers/me` to determine current customer.
- Medusa authenticated routes reading customer actor from session.
- Future order list route filtering by server-side `customer_id`.

Forbidden:

- Trusting frontend `customer_id`.
- Trusting email alone as logged-in identity.
- Using localStorage customer id.
- Using the publishable key as customer auth.
- Passing customer access tokens in URLs.
- Plain base64 session tokens.
- Storing passwords in browser storage.

## CORS / Credentials

The local environment already includes storefront origins in `.env`:

- `http://127.0.0.1:5174`
- `http://localhost:5174`
- `http://localhost:3000`

For cookie sessions to work in browser runtime:

- `AUTH_CORS` must include the frontend dev origin.
- `STORE_CORS` must include the frontend dev origin.
- frontend requests must use `credentials: "include"`.

## Checkout Binding

Batch 9 adds frontend use of Medusa native:

```http
POST /store/carts/:cart_id/customer
```

Only logged-in sessions call this route. The frontend does not send `customer_id`; Medusa reads the current authenticated customer actor.

Guest checkout remains supported. Guest orders continue to rely on `order.email` for single-order lookup/detail/tracking.

## Future Authenticated Order List

Future Batch 10 should use:

```http
GET /store/customers/me/orders
```

Security model:

- Require customer session.
- Require `x-publishable-api-key`.
- Require `X-Store-Id`.
- Filter by backend-authenticated `customer_id`.
- Filter by current store context.
- Do not accept `email` or `customer_id` as identity query params.

## Gaps

- Password reset is not implemented.
- Email verification is not implemented.
- MFA is not implemented.
- Rate limiting is not implemented in project-owned code.
- Session management UI is not implemented.
- Account deletion is not implemented.
- Authenticated order list is not implemented in this batch.
