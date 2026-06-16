# Buyer Auth Security Gap

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Implemented In Batch 9

- Medusa native customer email/password register and login integration.
- Medusa session-cookie creation.
- Current customer loading through `GET /store/customers/me`.
- Logout through `DELETE /auth/session`.
- Basic profile update through `POST /store/customers/me`.
- Storefront AuthProvider/AuthContext.
- Auth-required account UI.
- Optional authenticated cart-customer binding through `POST /store/carts/:cart_id/customer`.

## Explicitly Not Implemented

- Authenticated order list API.
- Address book.
- Saved payment methods.
- Refunds, returns, cancellation, reorder.
- Password reset.
- Email verification.
- MFA.
- Session/device management.
- Account deletion.

## Security Model

Trusted identity:

- Medusa customer session cookie.
- Medusa route auth context.

Untrusted:

- frontend email field
- localStorage
- sessionStorage
- URL query `customer_id`
- URL query `email` for account identity
- publishable API key

Guest order lookup/detail/tracking remains separate and still requires order-specific knowledge plus matching email.

## Known Gaps

### Rate Limiting

Project-owned rate limiting was not added in Batch 9.

Recommended follow-up:

- Add rate limiting to auth routes at gateway/proxy or backend middleware level.
- Apply tighter limits to login/register/session creation.

### Email Verification

New customers are not required to verify email before accessing account pages.

Recommended follow-up:

- Add email verification before sensitive account actions.
- Keep guest order lookup email matching unchanged until verified account linking is available.

### Password Reset

No buyer password reset flow is implemented.

Recommended follow-up:

- Use Medusa/native auth provider reset capability if available.
- Do not implement custom token signing without expiry and single-use semantics.

### Customer / Store Relationship

Batch 9 relies on Medusa customer identity plus `X-Store-Id` store context. The project still needs a formal rule for whether a customer is global across stores or store-scoped.

Future order list must still filter orders by:

- authenticated `customer_id`
- current resolved store id

### Checkout Customer Binding

Batch 9 calls the native cart-customer binding route when a customer is logged in.

Still needs runtime verification:

- Complete an authenticated checkout.
- Confirm the resulting order has `customer_id`.
- Confirm guest checkout remains unaffected.

### Authenticated Order List

Do not implement:

```http
GET /store/orders?email=buyer@example.com
```

Future secure endpoint should be:

```http
GET /store/customers/me/orders
```

It must read customer identity from Medusa auth context, not request parameters.

## Logging Rules

Do not log:

- passwords
- full bearer tokens
- session cookies
- reset tokens

Runtime smoke commands should avoid printing tokens or passwords.
