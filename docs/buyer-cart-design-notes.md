# Buyer Cart Design Notes

Date: 2026-06-15

Branch: `experiment/buyer-plus-supplier-runtime`

Scope: Batch 3 visual judgment for rebuilding `/cart`.

## Summary

The primary cart reference is `designs/buyer-ui/购物车详情/Group 96.png`.

The design set is Amazon-inspired: a light gray page background, white cart panel, selected line item row with image/specs/actions, right sticky summary card, recommendation rail, and Citigoo footer. Batch 3 should implement the cart data and mutation flow only. Checkout, payment management, credit-card entry, and address entry remain out of scope.

## Image Inventory

| File | State | Notes |
| --- | --- | --- |
| `designs/buyer-ui/购物车详情/Group 96.png` | Normal cart base state | Main cart with one selected line, quantity stepper, delete/save/share actions, right subtotal card, recommendations, footer. Use as the primary `/cart` visual target. |
| `designs/buyer-ui/购物车详情/Group 97.png` | Expanded pricing/payment-management state | Cart plus richer right summary with discounts and a payment methods section below recommendations. Treat discount/payment sections as static visual content for Batch 3; checkout remains a link only. |
| `designs/buyer-ui/购物车详情/Group 98.png` | Add new card modal | Payment modal over cart. Out of scope because Batch 3 must not implement checkout/payment. |
| `designs/buyer-ui/购物车详情/Group 99.png` | Delete confirmation modal | Overlay confirmation for removing a cart line item. Implement this state because DELETE line item is in Batch 3 scope. |
| `designs/buyer-ui/购物车详情/100.png` | Add shipping address modal | Address form over cart. Out of scope for Batch 3 because checkout/address is not implemented yet. |

## Cart UI Requirements From `Group 96.png`

- Page title: `Shopping Cart`.
- Selection row: `Deselect all items` copy and left checkbox visuals.
- Cart line: image, truncated title, badge/category line, stock/return copy, gift checkbox, selected options, quantity stepper, delete/save/share actions, line price.
- Summary card: item count, subtotal/total, gift checkbox, checkout button.
- Checkout button: navigates to `/checkout` only.
- Empty state: if no store-scoped cart id or no line items, show a designed empty cart state with a return-to-store action.
- Delete confirmation: modal matching `Group 99.png`, calling the real DELETE endpoint.
- Quantity changes: stepper calls the real PUT endpoint.

## Out-of-Scope States

- Payment methods management and add-card modal from `Group 97.png`/`Group 98.png`.
- Shipping address modal from `100.png`.
- Real checkout page or payment/address persistence.

## Implementation Notes

- Read cart id from `localStorage` using `citigoo:${storeId}:cart_id`.
- Never fabricate cart line items for display. If the cart API fails, show an error state.
- Product line display should prefer line item fields and metadata: title, thumbnail/mockup image, color, size, selected options, variant title.
- Cart totals should come from cart response: subtotal, total, currency code.
- Deleting the last item should transition to empty state.
