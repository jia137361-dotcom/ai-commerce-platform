# Buyer Auth API Contract

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Architecture

Batch 9 uses Medusa native customer auth and store customer APIs. The storefront API client wraps these routes but does not implement password handling itself.

Session model: **HttpOnly Medusa session cookie**.

Frontend request mode:

- `credentials: "include"`

Required store headers:

- `x-publishable-api-key`
- `X-Store-Id`

## Register

### Step 1: Register auth identity

```http
POST /auth/customer/emailpass/register
```

Request body:

```json
{
  "email": "buyer@example.com",
  "password": "buyer-password"
}
```

Response:

```json
{
  "token": "opaque-medusa-auth-token"
}
```

Frontend function:

- `registerCustomer(input)`

Notes:

- Email is trimmed and lowercased by the frontend before submission.
- Token is used only to create customer/session and is not persisted.

### Step 2: Create store customer

```http
POST /store/customers
```

Required headers:

- `Authorization: Bearer <token>`
- `x-publishable-api-key`
- `X-Store-Id`

Request body:

```json
{
  "email": "buyer@example.com",
  "first_name": "Buyer",
  "last_name": "Demo",
  "phone": "+15550100"
}
```

Response shape:

```json
{
  "customer": {
    "id": "cus_...",
    "email": "buyer@example.com",
    "first_name": "Buyer",
    "last_name": "Demo",
    "phone": "+15550100"
  }
}
```

### Step 3: Create session

```http
POST /auth/session
```

Required headers:

- `Authorization: Bearer <token>`

Response:

```json
{
  "user": {}
}
```

Browser result:

- Medusa sets the customer session cookie.

## Login

```http
POST /auth/customer/emailpass
```

Request body:

```json
{
  "email": "buyer@example.com",
  "password": "buyer-password"
}
```

Response:

```json
{
  "token": "opaque-medusa-auth-token"
}
```

Frontend then calls:

```http
POST /auth/session
```

Frontend function:

- `signInCustomer(input)`

After session creation, frontend calls `GET /store/customers/me`.

## Current Customer

```http
GET /store/customers/me
```

Required:

- session cookie
- `x-publishable-api-key`
- `X-Store-Id`

Response:

```json
{
  "customer": {
    "id": "cus_...",
    "email": "buyer@example.com",
    "first_name": "Buyer",
    "last_name": "Demo",
    "phone": "+15550100"
  }
}
```

Frontend function:

- `getCurrentCustomer()`
- `refreshCustomer()`

## Update Profile

```http
POST /store/customers/me
```

Required:

- session cookie
- `x-publishable-api-key`
- `X-Store-Id`

Allowed request body:

```json
{
  "first_name": "Buyer",
  "last_name": "Updated",
  "phone": "+15550199"
}
```

Forbidden:

- `email`
- `password`
- `customer_id`
- payment fields
- address book mutations

Frontend function:

- `updateCustomerProfile(input)`

## Logout

```http
DELETE /auth/session
```

Required:

- session cookie

Frontend function:

- `signOutCustomer()`

Expected behavior:

- Medusa destroys the session.
- Frontend clears in-memory auth state.
- Subsequent `GET /store/customers/me` returns 401.

## Cart Customer Binding

```http
POST /store/carts/:cart_id/customer
```

Required:

- session cookie
- `x-publishable-api-key`
- `X-Store-Id`

Request body:

```json
{}
```

Response:

```json
{
  "cart": {}
}
```

Frontend function:

- `attachCustomerToCart(cartId)`

Security:

- Frontend does not send `customer_id`.
- Medusa uses authenticated customer actor from the session.

## Storefront Auth Context

Files:

- `apps/storefront/src/auth/BuyerAuthProvider.tsx`
- `apps/storefront/src/auth/useBuyerAuth.ts`

Exposed state/actions:

- `customer`
- `isAuthenticated`
- `isLoading`
- `signIn()`
- `register()`
- `signOut()`
- `refreshCustomer()`
- `updateProfile()`

## Routes

- `/account/sign-in`
- `/account/register`
- `/account`
- `/account/profile`
- `/account/orders` remains an auth-required order-history shell.

## Token Lifecycle

- Auth token is returned by Medusa login/register.
- Auth token is immediately exchanged for session with `POST /auth/session`.
- Auth token is never persisted by the storefront.
- Session recovery after browser refresh uses `GET /store/customers/me`.
