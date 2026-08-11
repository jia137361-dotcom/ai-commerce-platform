# Buyer UI Design Coverage Recheck

Date: 2026-06-21
Branch: `merge-seller-into-buyer`
Batch: MKT-01

Status vocabulary: `covered` means visual structure and real data flow are both usable; `partial` means usable UI but an incomplete backend/data capability; `placeholder` means an explicitly unavailable surface; `missing` means no route; `misleading-demo` means a UI appears real but is backed by fabricated behavior.

## DESIGN_COVERAGE_RECHECK

| design folder | expected production route | current route | current status | matches visual structure | real data | gap | action |
|---|---|---|---|---|---|---|---|
| `shop page` | `/store`, `/store/:storeId` | `/store` | partial | Hero, identity, tabs/filters, product grid and about sections follow the design | Store settings, follow state, categories and products | Single-store route only; no seller messaging; gallery may be empty | MKT-01 connects seller-managed about, announcement, banner and gallery metadata; plan STORE-01 for a first-class profile model |
| `单店` | `/products/:id` | `/products/:id` | partial | Gallery, purchase panel, details, reviews and related products exist | Product, native variants, review read and share APIs | Publish bridge creates only one native Default variant; no review composer | MKT-01 fixes multi-native-variant frontend eligibility; SUP-01 and REVIEW-01 remain |
| `购物车详情` | `/cart` | `/cart` | covered | Item list, quantity, delete, summary and recommendations | Real cart APIs | No promotion UI; no saved-for-later | MKT-01 isolates storage by store + buyer/guest identity |
| `结算` | `/checkout` | `/checkout` | partial | Contact, delivery, shipping, payment and summary cards | Real cart/address/shipping/complete flow | No saved address book; system provider authorizes only | MKT-01 adds country select and honest shipping unavailable state; PAY batches remain |
| `订单` | `/account/orders` | `/account/orders` | partial | List/status/detail actions exist | Authenticated own-order APIs | Several design overlays/actions are unavailable | Keep honest unavailable states; AFTERSALES-01 later |
| `订单详情页面` | `/account/orders/:id` | `/account/orders/:id` | partial | Status, items, totals, address and actions exist | Real order/cancel/refund-request capability | No real return/exchange/provider refund | AFTERSALES-01 |
| `订单/物流追踪页.png` | `/account/orders/:id/tracking` | same | partial | Status cards, timeline, package, payment details and quick actions now align structurally | Real supplier order, shipment, carrier and order detail fields | No real carrier provider; seller mock-shipment is test-only | Keep mock clearly labeled; replace with S2BDIY/carrier events |
| `登录注册` | `/account/sign-in`, `/account/register` | same | covered | Production auth forms and return path | Medusa customer auth/session | Password recovery/verification missing | SECURITY-01 |
| `Profile` | `/account/profile` | same | partial | Profile form exists | Real name/phone update | Avatar, email change and richer preferences missing | ACCOUNT-01 |
| `Account & Security` | `/account/security` | same | placeholder | Honest capability card, not full design | Session sign-in/out only | Reset/change password, MFA and sessions missing | SECURITY-01; do not add more placeholder states |
| `Delivery address` | `/account/addresses` | same | placeholder | Honest capability card | Checkout-only address update | Address book backend absent | ADDRESS-01 |
| `Country & region` | `/account/country-region` | same | placeholder | Honest capability card | Checkout country select only | Account/catalog region switching absent | REGION-01 |
| `Currency` | `/account/currency` | same | placeholder | Honest capability card | Backend/cart currency display only | Preference and real multi-currency pricing absent | CURRENCY-01 |
| `coupons` | `/account/coupons` | same | placeholder | Honest capability card | None | Wallet, expiry, eligibility, single-use redemption absent | COUPON-01; no fake 3% coupon added |
| `Follow` | `/account/following` | same | partial | Account list is placeholder; store follow control exists | Customer metadata + store follower count API | No followed-store list route | FOLLOW-01 |
| `Help Center` | `/help` | `/help` | partial | Static help content | Store support email can be displayed | No tickets/chat | SUPPORT-01 and CHAT-01 |
| `辅助页` | notifications/settings/about | partial static routes | missing/placeholder | Only selected static informational structure | Mostly static | Notifications and messaging domains absent | Separate feature batches |

No new fake account, coupon, currency, address-book, notification, or support workflows were added. Those designs should become capability batches, not a growing placeholder collection.

## Visual Notes

- The shop design expects seller-owned identity and hero content. MKT-01 uses the existing store-settings metadata bridge for these fields.
- The tracking design contains “paid”, “in transit”, estimated delivery and delivered states. The implementation intentionally renders those only when backend evidence exists.
- The payment design contains card language. Current UI explicitly disables the card preview because no Stripe element is mounted and no card data is collected.
