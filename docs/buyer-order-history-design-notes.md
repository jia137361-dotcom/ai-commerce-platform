# Buyer Order History Design Notes

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Order List Main Page

Primary order history references:

- `designs/buyer-ui/订单/Body.png`
- `designs/buyer-ui/订单/Body-1.png`
- `designs/buyer-ui/订单/Body-2.png`
- `designs/buyer-ui/订单/Body-3.png`
- `designs/buyer-ui/订单/Body-4.png`
- `designs/buyer-ui/订单/Body-5.png`
- `designs/buyer-ui/订单/Body-6.png`
- `designs/buyer-ui/订单/Body-7.png`
- `designs/buyer-ui/订单/Body-8.png`
- `designs/buyer-ui/订单/Body-9.png`
- `designs/buyer-ui/订单/Body-10.png`
- `designs/buyer-ui/订单/Body-11.png`
- `designs/buyer-ui/订单/Body-12.png`
- `designs/buyer-ui/订单/Body-13.png`

These screens show an account-style order center with:

- Left account sidebar.
- Top status tabs.
- Search box.
- Repeated order cards.
- Per-order actions.

## Status Tabs

The visible tabs in the provided design set are:

- `All`
- `Unpaid`
- `Shipped`
- `Delivered`
- `Reviews`
- `Returns`

For product planning, these map roughly to:

- All
- Pending / Unpaid
- Paid / Processing
- Shipped
- Completed / Delivered
- Cancelled / Returns / After-sales

Batch 8 does not implement real tabs because there is no secure authenticated order list API yet.

## Empty Order State

The empty order state appears in:

- `designs/buyer-ui/订单/Body-3.png`

It shows an account sidebar, tabs/search, and a central empty illustration with copy like “You have no related orders.”

Batch 8 uses this as visual inspiration for an auth-required shell, but does not show fake empty results as if a real order list had been queried.

## Refund / Cancel / After-Sales States

Out of scope for Batch 8:

- Cancel refund dialogs.
- Cancel order actions.
- Refund / after-sales labels.
- Buy again.
- Confirm delivery.
- Invoice request.
- Change address.

These states appear throughout `Body*.png` and `订单详情页*.png`, but require real account/order-action APIs.

## Order Detail / Tracking

Already handled in previous batches:

- `designs/buyer-ui/订单/物流追踪页.png`: hybrid order detail/tracking page.
- `designs/buyer-ui/订单/订单详情页*.png`: account order card/detail-like states, not a guest order list route.
- `designs/buyer-ui/订单详情页面/Group 83-86.png`: product detail/share states, not order history.

## Batch 8 Visual Decision

Because secure authenticated order history is not currently available, Batch 8 implements a restrained `/account/orders` shell:

- Account/order center layout.
- Auth-required message.
- Find an order button linking to `/orders/lookup`.
- Back to store.
- No mock order cards.
- No unsafe email-based all-orders query.
