# Buyer Order Detail API Gap

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Actual Route

Batch 7 adds:

```http
GET /store/orders/:order_id/detail?email=buyer@example.com
```

## Guest Security Model

The route is guest-accessible but requires all of the following:

- `x-publishable-api-key` header.
- `X-Store-Id` header.
- Order must belong to the resolved store context.
- `email` query parameter is required.
- `email` must match `order.email` after trim/lowercase normalization.
- Orders with `order.email=null` cannot be accessed through this guest route.

The route does not allow full order detail access by `order_id` alone.

## Response Fields

The route returns a white-listed detail shape:

- `order_id`
- `display_id`
- `store_id`
- `email`
- `status`
- `payment_status`
- `fulfillment_status`
- `created_at`
- `currency_code`
- `items[]`
- `shipping_address`
- `billing_address`
- `subtotal`
- `shipping_total`
- `discount_total`
- `tax_total`
- `total`

Item fields:

- `id`
- `product_id`
- `variant_id`
- `title`
- `variant_title`
- `thumbnail`
- `quantity`
- `unit_price`
- `subtotal`
- `metadata`

## Money Unit

Amounts are returned in the same minor-unit convention used by the current cart and complete APIs. The storefront formats them through the existing `formatBuyerMoney()` helper.

## Missing / Partial Fields

The API intentionally returns `null` when fields are absent. It does not estimate missing values from metadata.

Known gaps:

- Shipping address may be `null` for non-shipping products.
- Shipment/tracking numbers are not part of order detail; use tracking API.
- Payment method details are not normalized yet.
- No refund/cancel/return/reorder data is returned.
- No invoice data is returned.

## Not Implemented In Batch 7

- Buyer account/auth.
- Order list.
- Cancel.
- Refund.
- Return.
- Reorder.
- Fake logistics or payment data.

## Verified Runtime Order

```text
order_id: order_01KV7MNM9RCGWQJVSJ4GAPDKV0
display_id: 63
email: batch65.buyer+smoke@example.com
```

Expected checks:

- Correct email returns HTTP 200.
- Wrong email returns HTTP 403.
- Email-null historical orders remain inaccessible via guest detail.
