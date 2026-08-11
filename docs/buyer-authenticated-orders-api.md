# Buyer Authenticated Orders API

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## List My Orders

```http
GET /store/customers/me/orders
```

### Required Auth

- Medusa customer session cookie.
- `credentials: include` from storefront.

### Required Headers

- `x-publishable-api-key`
- `X-Store-Id`

### Query Params

- `limit`: optional number, default `20`, max `50`.
- `offset`: optional number, default `0`.
- `status`: optional native order status filter.
- `payment_status`: optional project metadata payment status.
- `fulfillment_status`: optional project metadata fulfillment status.

Identity params are not accepted:

- no `customer_id`
- no `email`

### Response

```json
{
  "orders": [
    {
      "order_id": "order_...",
      "display_id": 63,
      "created_at": "2026-06-16T08:00:00.000Z",
      "email": "buyer@example.com",
      "status": "pending",
      "payment_status": "paid",
      "fulfillment_status": "waiting",
      "currency_code": "usd",
      "total": 2500,
      "item_count": 2,
      "preview_items": [
        {
          "title": "Printed item",
          "thumbnail": "https://example.test/item.png",
          "quantity": 1
        }
      ]
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}
```

Fields that are not available are returned as `null` or omitted in preview item fields. No supplier credentials, payment secrets, or internal sensitive metadata are exposed.

### Frontend Client

```ts
getMyOrders({
  limit,
  offset,
  status,
  paymentStatus,
  fulfillmentStatus,
})
```

The client uses the existing `apiFetch`, which sends store headers and `credentials: "include"`.

## Authenticated Order Detail

```http
GET /store/orders/:order_id/detail
```

Authenticated mode:

- Requires matching session customer.
- Does not require `email` query.
- Rejects authenticated customer mismatch with 403.

Guest mode remains:

```http
GET /store/orders/:order_id/detail?email=buyer@example.com
```

Guest mode requires matching order email.

Frontend client:

```ts
getOrderDetail(orderId, email?)
```

## Authenticated Tracking

```http
GET /store/orders/:order_id/tracking
```

Authenticated mode:

- Requires matching session customer.
- Does not require `email` query.

Guest mode remains:

```http
GET /store/orders/:order_id/tracking?email=buyer@example.com
```

Frontend client:

```ts
getOrderTracking(orderId, email?)
```

## Storefront Routes

- `/account/orders`: authenticated order list.
- `/account/orders/:order_id`: authenticated detail when logged in, guest detail when `email` query/session email exists.
- `/account/orders/:order_id/tracking`: authenticated tracking when logged in, guest tracking when `email` query/session email exists.
- `/orders/lookup`: guest single-order lookup remains unchanged.

## Runtime Curl Shape

List current customer orders:

```bash
curl -s \
  -b /tmp/citigoo-auth-cookie.txt \
  -H "x-publishable-api-key: $PK" \
  -H "X-Store-Id: default_store" \
  "http://127.0.0.1:9000/store/customers/me/orders?limit=10&offset=0"
```

Authenticated detail:

```bash
curl -s \
  -b /tmp/citigoo-auth-cookie.txt \
  -H "x-publishable-api-key: $PK" \
  -H "X-Store-Id: default_store" \
  "http://127.0.0.1:9000/store/orders/$ORDER_ID/detail"
```
