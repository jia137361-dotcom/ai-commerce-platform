# Backend Capability Map

Date: 2026-06-20

## Shared Access Rules

Buyer business requests use:

- `x-publishable-api-key`
- `X-Store-Id`
- `credentials: include` for authenticated customer routes

Authenticated identity must come from Medusa auth context/session, never frontend `customer_id` or an unverified email. Guest order access remains limited to order identifier plus matching email.

## Auth And Customer

| Capability | Endpoint | Access | Status | Frontend consumer | Limitation / next work |
|---|---|---|---|---|---|
| Register identity | `POST /auth/customer/emailpass/register` | guest | implemented, native | register page | No email verification/rate-limit audit UX |
| Create customer | `POST /store/customers` | bearer registration token | implemented, native | `registerCustomer()` | Store membership model remains Medusa-native |
| Login identity | `POST /auth/customer/emailpass` | guest | implemented, native | sign-in page | Password recovery missing |
| Create session | `POST /auth/session` | bearer login token | implemented, native | auth provider | HttpOnly cookie; CORS/credentials required |
| Logout | `DELETE /auth/session` | customer session | implemented, native | auth provider | Multi-session management missing |
| Current customer | `GET /store/customers/me` | customer session | implemented, native | all account pages | Basic profile fields only |
| Update profile | `POST /store/customers/me` | customer session | implemented, native | profile page | No avatar/security/address-book contract |
| Bind cart customer | `POST /store/carts/:id/customer` | customer session | implemented, native | checkout | Customer id is server-derived |

## Store And Catalog

| Capability | Endpoint | Access | Status | Frontend consumer | Limitation / next work |
|---|---|---|---|---|---|
| Store settings | `GET /store/settings` | guest + store headers | implemented | store/account shell | Storefront still has static fallback |
| Product categories | `GET /store/product-categories` | guest + store headers | implemented | store category nav | Advanced hierarchy/filter UX incomplete |
| Product list | `GET /store/products` | guest + store headers | implemented | `/store` | Fallback remains; variant option projection limited |
| Product detail | `GET /store/products/:id` | guest + store headers | implemented | product detail | Does not expose complete selectable variant/options model |
| Product reviews | `GET /store/products/:id/reviews` | guest + store headers | implemented, read-only | product detail | Review creation/verified purchase/moderation missing |
| Product share | `GET /store/products/:id/share` | guest + store headers | implemented | product detail | Link-focused; social/contact integrations incomplete |
| Platform/supplier catalog | `/store/platform-products`, `/store/supplier-products` | guest/store scoped | implemented for bridge use | not primary buyer page | Operational/catalog bridge, not final buyer contract |

## Cart And Checkout

| Capability | Endpoint | Access | Status | Frontend consumer | Limitation / next work |
|---|---|---|---|---|---|
| Create cart | `POST /store/carts` | guest + store headers | implemented | product/cart flow | Must retain region/sales channel/store metadata |
| Read cart | `GET /store/carts/:id` | guest cart + store headers | implemented | cart/checkout | Cart possession model; no signed cart token |
| Add line | `POST /store/carts/:id/line-items` | guest cart + store headers | implemented | product detail | Requires native variant bridge and calculated/unit price path |
| Update quantity | `PUT /store/carts/:id/line-items/:line_id` | guest cart + store headers | implemented | cart | Store isolation enforced |
| Remove line | `DELETE /store/carts/:id/line-items/:line_id` | guest cart + store headers | implemented | cart | Store isolation enforced |
| Save contact | `PUT /store/carts/:id/contact` | guest/auth cart | implemented | checkout | Email required before complete |
| Save shipping address | `PUT /store/carts/:id/address` | guest/auth cart | implemented with guarded module fallback | checkout | No address book; billing address not auto-copied |
| Shipping options | `GET /store/carts/:id/shipping-options` | guest/auth cart | implemented | checkout | Depends on real region/address/profile/options |
| Select shipping method | `POST /store/carts/:id/shipping-methods` | guest/auth cart | implemented | checkout | No carrier-rate shopping beyond configured options |
| Complete cart | `POST /store/carts/:id/complete` | current UI authenticated | implemented for authorization/order creation | checkout | Does not capture payment; `pp_system_default` authorizes only in verified runtime |

## Orders

| Capability | Endpoint | Access | Status | Frontend consumer | Limitation / next work |
|---|---|---|---|---|---|
| Guest lookup | `GET /store/orders/lookup?email=&display_id=` | guest | implemented | `/orders/lookup` | Single-order lookup only; email-null legacy orders inaccessible |
| Guest/auth detail | `GET /store/orders/:id/detail?email=` | dual mode | implemented | order detail | Guest requires matching email; null fields stay null |
| Authenticated detail | `GET /store/customers/me/orders/:id` | customer session | implemented | order detail | Own-customer/store only |
| Authenticated list | `GET /store/customers/me/orders` | customer session | implemented | `/account/orders` | Pagination and status filters; guest orders with no customer id excluded |
| Tracking | `GET /store/orders/:id/tracking?email=` | dual mode | implemented | tracking page | Carrier/tracking/events often absent until fulfillment sync exists |
| Restricted cancel | `POST /store/customers/me/orders/:id/cancel` | customer session | implemented | order detail | Only authorized/unpaid, unfulfilled, no active post-cancel authorization |
| Refund request list | `GET /store/customers/me/orders/:id/refund-requests` | customer session | implemented | order detail | Intent records only |
| Create refund request | `POST /store/customers/me/orders/:id/refund-requests` | customer session | implemented | order detail | Requires captured evidence; creates `pending`, never returns money |

## Payment And Refund Truth

| Capability | Current status | Evidence | Required next work |
|---|---|---|---|
| Provider registration | implemented | `pp_system_default` | Select production provider and sandbox |
| Authorization | runtime verified | authorized collection/payment/session | Define expiry/void monitoring |
| Capture | blocked/unverified | checkout does not call capture; latest positive smoke unavailable | Choose capture timing and provider contract |
| Refund request | implemented | custom pending request module/API | Add admin/supplier review lifecycle |
| Real full refund | missing | no provider workflow invoked | Provider integration, idempotency, webhooks, reconciliation |
| Partial refund | missing | no amount/item allocation workflow | Tax/shipping/item allocation and provider support |
| Refund status sync | missing | only local request status placeholders | Webhook-driven authoritative state |

`paid` metadata or buyer-facing status is not sufficient payment evidence. A refund must never be presented as completed without provider-confirmed execution and reconciliation.

## Fulfillment And Supplier Operations

| Capability | Endpoint / module | Access | Status | Frontend consumer | Limitation / next work |
|---|---|---|---|---|---|
| Fulfillment order queue | `/admin/fulfillment-orders` | admin | implemented/partial | supplier/admin only | Product-grade supplier ownership/RBAC audit needed |
| Push fulfillment | `/admin/orders/:id/push-fulfillment` | admin | implemented bridge | none buyer-direct | Real supplier/carrier failure handling incomplete |
| Supplier order detail/retry | admin supplier-order routes | admin | implemented bridge | none buyer-direct | Buyer action synchronization incomplete |
| Shipment update | `/admin/orders/:id/mock-shipment` | admin/test | mock-only | tracking reads resulting fields | Replace with real carrier/supplier events |
| Buyer shipping options | cart shipping APIs | buyer cart | implemented | checkout | Configured manual provider in smoke environment |
| Return fulfillment | none | n/a | missing | none | Define return authorization/logistics |

## Missing Buyer Domains

| Domain | Proposed API direction | Status | Frontend | Required next work |
|---|---|---|---|---|
| Address book | `/store/customers/me/addresses` | missing | embedded checkout form only | Secure CRUD, default address, country/region validation |
| Coupons | cart promotion apply/remove + customer coupon wallet | missing | static shell/design only | Eligibility, stacking, totals, persistence |
| Follow | `/store/customers/me/follows` | missing | no route | Store/product follow model and pagination |
| Currency preference | customer/store preference route | missing/partial native context | no functional page | Separate display and settlement currency |
| Region preference | customer/store preference + cart region migration | missing/partial | checkout country only | Define cart invalidation/repricing behavior |
| Help/support | help content + ticket/contact route | missing | no functional page | Decide static CMS vs support tickets |
| Messaging/chat | threads/messages/unread endpoints | missing | no page | Customer/store/order permissions, moderation, retention |
| Review write | verified order-item review endpoint | missing | read-only review panel | Purchase entitlement, one-review policy, moderation |
| Notifications | customer notification feed/read state | missing | design only | Event sources, delivery channels, retention |
| Account security | password reset/change, verification, MFA, sessions | partial native auth foundation | no security route | Security architecture and UX |

## API Consumers And Ownership

- `apps/storefront/src/lib/buyer-api.ts` is the active buyer client.
- Page routes should not call supplier/admin APIs.
- Legacy `store-api.ts` and mock components remain reference/cleanup candidates, not the current contract authority.
- New APIs must preserve publishable-key checks, store isolation, trusted customer identity, stable error codes, and null rather than fabricated data.

