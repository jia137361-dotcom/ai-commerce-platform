# Buyer Order Detail Design Notes

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Design Judgment

### Order Detail Main Page

Primary reference:

- `designs/buyer-ui/订单/物流追踪页.png`

Although named as a logistics tracking page, this PNG is the only provided screen that clearly contains a complete order detail layout:

- Order title and order id/date
- Status timeline
- Shipping progress panel
- Delivery address
- Package contents
- Payment details
- Order information
- Quick actions

Batch 7 implements only the guest order detail parts backed by real API data:

- Order header/status
- Items/package contents
- Payment/amount summary
- Contact email
- Delivery address when present
- Safe actions: Track order, Back to store, Search another order

It does not implement receipt confirmation, invoice, support, return, refund, reorder, cancel, or account-only actions.

### Tracking Page

Also related:

- `designs/buyer-ui/订单/物流追踪页.png`

The same image contains tracking-specific elements such as status timeline, shipment progress, and latest milestone. Batch 6 already implemented the dedicated tracking page using only real tracking/shipment API fields.

### Account Order List / Refund / Cancel States

These screens are account-order-list views, not guest detail pages:

- `designs/buyer-ui/订单/Body.png`
- `designs/buyer-ui/订单/Body-*.png`
- `designs/buyer-ui/订单/订单详情页.png`
- `designs/buyer-ui/订单/订单详情页-1.png`

They show sidebar account navigation, tabs such as All/Unpaid/Shipped/Delivered/Reviews/Returns, order cards, refund/cancel refund states, and account actions. These are out of scope for Batch 7.

### Group 83-86

The files in `designs/buyer-ui/订单详情页面/` do not represent buyer order detail:

- `Group 83.png`: product detail page with share/forward modal.
- `Group 84.png`: product detail page long state.
- `Group 85.png`: product detail page reviews/parameters/description state.
- `Group 86.png`: product detail page with share popover.

They belong to product-detail/share states and should not drive Batch 7 order detail UI.

## Batch 7 Scope

Implement:

- Guest order detail page.
- Real order detail API.
- Email-based guest access.
- Links to tracking and lookup.

Do not implement:

- Buyer account/auth.
- Order list.
- Cancel/refund/return/reorder.
- Fake logistics, fake payment, or fake refund data.
