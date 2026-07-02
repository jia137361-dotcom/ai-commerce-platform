# Buyer Order History Access Audit

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Audit Findings

### Customer Registration / Login / Session APIs

No project-owned buyer customer registration/login/session routes were found under `apps/medusa-backend/src/api`.

The current storefront does not contain a real buyer login flow or persisted authenticated customer token/session.

### Store Customer Authentication Middleware

No custom store customer authentication middleware was found in the project source.

No route currently reads a trusted storefront customer identity from middleware.

### `req.auth_context` / Equivalent Identity

No usage of `req.auth_context`, `req.auth`, or equivalent authenticated customer identity was found in the current backend source.

### Customer / Order Association

Medusa carts/orders can carry `customer_id`, and payment preparation code references `cart.customer_id`. However the current buyer checkout flow is guest-first and only persists contact email.

Current checkout does not prove that the buyer is an authenticated customer, and Batch 6.5 only guarantees `cart.email`/`order.email`.

### Existing Workflow / Service For Customer Orders

The Order Module can list orders, but without a trusted current customer identity it cannot be safely exposed as a buyer order history endpoint.

### Checkout Customer Binding

Current checkout:

- Creates guest cart.
- Saves contact email.
- Completes cart.

It does not bind a verified logged-in `customer_id` from a buyer auth session.

### Signed Token / Magic Link / OTP

No signed guest order-history token, magic link, or OTP verification infrastructure was found in the current project source.

### Buyer Account Pages / Session Storage

The storefront has buyer-facing account/order placeholder UI and checkout success session storage. This is not authentication.

Session storage is only used to recover the latest checkout success context and must not be treated as identity.

## Selected Access Model

Selected: **Scheme C: UI shell only**.

Reason:

- Scheme A requires a verified authenticated customer session. The project does not currently provide one.
- Scheme B requires trusted signed/expiring token infrastructure. The project does not currently provide one.
- Returning all orders for an arbitrary `email` would allow order enumeration by anyone who knows or guesses an email address.

## Security Rule

Do not implement:

```http
GET /store/orders?email=user@example.com
```

unless email ownership is verified by login session, OTP, or a server-signed expiring token.

Guest access remains limited to single-order flows:

- lookup by `email + display_id`
- detail by `order_id + matching email`
- tracking by `order_id + matching email`

Historical `email=null` orders remain inaccessible through guest order history.
