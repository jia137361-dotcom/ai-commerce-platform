# Buyer Checkout Design Notes

Date: 2026-06-15

Branch: `feature/buyer-frontend-integration`

Scope: Batch 4 visual judgment for `/checkout` first-stage UI shell.

## Summary

The provided PNGs do not include one complete checkout page with contact, address, cart summary, shipping, payment, and place-order sections together. They mainly cover payment-method management and delivery-address management states. Batch 4 should therefore compose a checkout shell using the visual language from these designs: Citigoo top bar, gray page background, centered white panels, orange primary actions, thin dividers, and right-side cart summary.

## Checkout Images

| File | State | Notes |
| --- | --- | --- |
| `designs/buyer-ui/结算/Group 65.png` | Add payment card form | Standalone add-card page. Use only for payment section visual language. Do not implement real card storage in Batch 4. |
| `designs/buyer-ui/结算/Group 66.png` | Edit payment card form | Existing-card edit state with populated card fields. Out of scope for checkout shell. |
| `designs/buyer-ui/结算/Group 67.png` | Empty payment methods | Payment methods page with empty card state and add-card CTA. Use as static payment shell reference. |
| `designs/buyer-ui/结算/Group 68.png` | Payment methods list | Payment methods list with saved cards and manage action. Static shell only in Batch 4. |
| `designs/buyer-ui/结算/Group 70.png` | Payment methods list variant | Similar saved-card list state with security copy. Static shell only. |
| `designs/buyer-ui/结算/Group 71.png` | Payment methods management/delete state | Saved cards with delete actions and exit management. Out of scope for Batch 4. |

## Delivery Address Images

| File | State | Notes |
| --- | --- | --- |
| `designs/buyer-ui/Delivery address/Delivery address.png` | Address selection list | Delivery-address list with selected default/home address and add-address CTA. Use for checkout address panel layout. |
| `designs/buyer-ui/Delivery address/Delivery address-1.png` | Address management list | Address list with radio selectors, edit/delete/copy controls. Out of scope for Batch 4 persistence. |
| `designs/buyer-ui/Delivery address/Delivery address-2.png` | Add/edit address modal empty | Address modal with required fields and disabled save. Use for form styling. |
| `designs/buyer-ui/Delivery address/Delivery address-3.png` | Add/edit address modal valid | Address modal with selected label/default and enabled save. Use for local address form state. |
| `designs/buyer-ui/Delivery address/Delivery address-4.png` | Empty address list | No delivery address state with add-address CTA. Use when checkout form has no local address data. |

## Batch 4 UI Target

- Route: `/checkout`.
- Header: reuse Citigoo buyer top bar style.
- Main layout: left checkout panels, right sticky summary.
- Left panels:
  - Contact information form: email, phone, name.
  - Delivery address form/list shell: local state only, no backend save claim.
  - Shipping method shell: static pending state until shipping options API exists.
  - Payment method shell: static card/payment visual state, no real payment.
  - Coupon/discount shell: static input visual.
- Right summary:
  - Real cart line items from `GET /store/carts/:cart_id`.
  - Real subtotal/total/currency from cart response.
  - Place Order/Continue disabled or backend-pending copy.

## Explicit Non-Goals

- No real card creation or editing.
- No checkout success page.
- No order tracking/detail implementation.
- No fake order completion.
- No address save to backend until an address update API exists and is verified.
