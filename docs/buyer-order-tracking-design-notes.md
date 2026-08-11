# Buyer Order Tracking Design Notes

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Design Inventory Judgment

### Order Lookup Entry

No dedicated guest order lookup PNG was found in the provided order folders. The closest related designs are:

- `designs/buyer-ui/订单/Body.png`
- `designs/buyer-ui/订单/Body-*.png`
- `designs/buyer-ui/订单/订单详情页.png`
- `designs/buyer-ui/订单/订单详情页-1.png`

These screens are account-style order list/status pages with sidebar navigation and tabs. Batch 6 should not implement the full account/order list, so `/orders/lookup` should use a clean standalone form that matches the existing checkout/cart visual language.

### Logistics Tracking Main Page

Primary visual reference:

- `designs/buyer-ui/订单/物流追踪页.png`

Despite the filename, this PNG is a hybrid order detail page. It includes:

- Order status timeline
- Shipping progress card
- Delivery address
- Latest milestone
- Package contents
- Payment details
- Order information
- Quick actions

Batch 6 should only implement the logistics/tracking portions backed by the current API:

- Header with order id/status
- Fulfillment status
- Shipment card
- Carrier/tracking number/tracking URL
- Timeline/events when available

Payment details, package contents, full delivery address, and quick actions belong to a later order detail batch.

### Logistics Status Variations

The order-list `Body*.png` files show order state variations such as unpaid, shipped, delivered, reviews, and returns. They are not guest tracking pages. They are useful only as visual references for status labels and orange accent treatment.

### Order Detail Screens Out Of Scope

The following are order detail/account/product-detail-adjacent screens and should not be implemented in Batch 6:

- `designs/buyer-ui/订单/订单详情页.png`
- `designs/buyer-ui/订单/订单详情页-1.png`
- `designs/buyer-ui/订单详情页面/Group 83.png`
- `designs/buyer-ui/订单详情页面/Group 84.png`
- `designs/buyer-ui/订单详情页面/Group 85.png`
- `designs/buyer-ui/订单详情页面/Group 86.png`

`Group 83.png` is a product detail/share overlay state, not buyer order tracking.
