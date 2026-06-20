# Buyer Frontend Design System Shell

Date: 2026-06-20

## 1. Goal

Create a restrained shared presentation layer that lets future pages match buyer-ui PNGs without changing commerce behavior. The shell should consolidate layout, controls, states, typography, spacing, borders, and status semantics while allowing page-specific compositions.

The shell is not a redesign, backend abstraction, or permission system. Business eligibility continues to come from existing API responses.

## 2. Proposed Structure

```text
src/components/ui/
  Button.tsx
  Card.tsx
  MoneyText.tsx
  StatusBadge.tsx
  States.tsx
  Modal.tsx
  Drawer.tsx
  FormField.tsx
  SelectField.tsx
  TextArea.tsx
src/components/layout/
  PageShell.tsx
  MobileShell.tsx
  AppHeader.tsx
  BottomNavigation.tsx
  SectionHeader.tsx
src/components/commerce/
  ProductCard.tsx
  OrderCard.tsx
  AddressBlock.tsx
  OrderSummary.tsx
  TrackingTimeline.tsx
src/styles/
  tokens.css
  primitives.css
```

Names may be adapted to avoid collisions with current components. Existing page-specific components should migrate incrementally rather than through a one-shot rename.

## 3. Component Contract

| Component | Purpose | Used by | Core data props | Design reference | Priority |
|---|---|---|---|---|---|
| `PageShell` | Desktop/mobile page frame with header, content width, footer and optional side navigation | all store, order, account, support pages | `header`, `children`, `footer`, `maxWidth`, `sidebar?`, `className?` | all desktop PNGs | FE-01 P0 |
| `MobileShell` | Compact viewport frame with safe areas and optional bottom navigation | account/settings/address/help mobile states | `title?`, `backHref?`, `actions?`, `bottomNav?`, `children` | `Account & Security`, `Profile`, `Delivery address`, `辅助页` | FE-01/FE-07 P1 |
| `Header / TopNav` | Brand/store identity, account, support, language and cart entry | store, product, cart, checkout, orders | `settings`, `cartCount`, `customer?`, `variant`, `onMenu?` | `shop page`, `单店`, order/cart PNGs | FE-01 P0 |
| `BottomNavigation` | Stable mobile navigation for Store, Orders, Account and optional Follow | mobile P0/P1 pages | `items`, `activeKey`, `ariaLabel` | account/profile/auxiliary mobile PNGs | FE-01 P1 |
| `SectionHeader` | Consistent page/section title with eyebrow, description and actions | every page section | `title`, `eyebrow?`, `description?`, `actions?`, `level?` | all modules | FE-01 P0 |
| `Card` | Single bounded content unit without nested decorative cards | product/order/address/account summaries | `children`, `variant`, `padding`, `interactive?`, `as?` | cart/order/account PNGs | FE-01 P0 |
| `ProductCard` | Product image, title, rating, price, badges and availability | store, recommendations, follow | `product`, `href`, `price`, `currency`, `rating?`, `badge?`, `unavailableReason?` | `shop page`, `单店`, `Follow` | FE-02 P0 |
| `OrderCard` | Order summary with preview items, statuses, total and actions | order history | `order`, `detailHref`, `trackingHref?`, `actions?` | `订单/Body*.png` | FE-01 P0 |
| `MoneyText` | Correct minor-unit formatting with semantic emphasis | product, cart, checkout, order | `amount`, `currencyCode`, `fallback?`, `variant?` | all commerce PNGs | FE-01 P0 |
| `StatusBadge` | Canonical visual status without changing backend meaning | cart availability, orders, refunds, shipping | `tone`, `label`, `icon?`, `title?` | order/cart/profile PNGs | FE-01 P0 |
| `PrimaryButton` | Main page action | add cart, checkout, save, sign in | common button props, `loading?`, `icon?` | all actionable PNGs | FE-01 P0 |
| `SecondaryButton` | Non-destructive secondary action | view details, track, continue shopping | common button props, `icon?` | all actionable PNGs | FE-01 P0 |
| `DangerButton` | Explicit destructive confirmation action | cancel order, delete cart line | common button props, `loading?`, `confirmContext?` | cart delete/order overlays | FE-01 P0 |
| `EmptyState` | Honest zero-data or unavailable-domain state | cart, orders, follow, coupons, messages | `title`, `message`, `icon?`, `primaryAction?`, `secondaryAction?` | cart/order/follow/coupon PNGs | FE-01 P0 |
| `LoadingState` | Stable loading region without layout shift | all API pages | `label`, `skeleton?`, `minHeight?` | inferred from page formats | FE-01 P0 |
| `ErrorState` | API/business error with optional safe retry | all API pages | `title`, `message`, `code?`, `retry?`, `actions?` | existing route states | FE-01 P0 |
| `Modal` | Accessible confirmation/form overlay | cart delete, cancel, refund request, share | `open`, `title`, `description?`, `children`, `footer`, `onClose`, `danger?` | `订单/Overlay*`, cart confirmation | FE-01 P0 |
| `Drawer` | Mobile side/bottom panel for navigation, address or filters | category menu, address, country/currency | `open`, `placement`, `title`, `children`, `onClose` | shop menu, address/settings PNGs | FE-02/FE-08 P1 |
| `FormField` | Label, input, hint and validation message | auth, checkout, profile, support | `label`, `name`, `value`, `error?`, `hint?`, native input props | `登录注册`, `Delivery address`, `Profile` | FE-01 P0 |
| `SelectField` | Accessible native/select-like choice | country, region, currency, shipping, product visual options | `label`, `value`, `options`, `error?`, `disabled?` | checkout/account settings/product PNGs | FE-01 P0 |
| `TextArea` | Multi-line reason/note/support input | cancel/refund request, support, messaging | `label`, `value`, `maxLength`, `error?`, `rows?` | order overlays, Help Center | FE-01 P0 |
| `AddressBlock` | Read-only or editable delivery address presentation | checkout, order detail, profile address book | `address`, `contact?`, `variant`, `actions?`, `emptyMessage?` | `Delivery address`, checkout/order detail | FE-05 P0 |
| `OrderSummary` | Lines, subtotal, shipping, discount, tax and total | cart, checkout, order detail | `items?`, monetary fields, `currencyCode`, `actions?`, `missingValueLabel?` | cart/checkout/order detail | FE-04 P0 |
| `Timeline / TrackingStep` | Real fulfillment/tracking events in chronological form | tracking and order detail | `events`, `currentStatus?`, `emptyLabel`, `trackingUrl?` | `订单/物流追踪页.png`, Group 83-86 | FE-06 P0 |

## 4. Tokens

Start with CSS custom properties in `tokens.css`; do not introduce a runtime theme system in FE-01.

### Foundation Groups

- color: canvas, surface, elevated surface, text, muted text, border, focus, brand orange, informational, success, warning, danger
- typography: display, page title, section title, body, caption, control; no viewport-scaled font sizes
- spacing: 4/8/12/16/24/32/48/64
- radius: 0/4/6/8; cards stay at or below 8px
- shadow: modal/drawer only, restrained card elevation
- dimensions: header height, mobile bottom-nav height, content max widths, control heights
- motion: short opacity/transform transitions with reduced-motion support

Do not derive the whole UI from one hue. Preserve white/neutral surfaces, dark text, orange action emphasis, blue/green status accents where the PNGs use them.

## 5. State And Payment Semantics

`StatusBadge` is presentation only. Mapping helpers may translate backend values into tones, but must not reinterpret eligibility:

- authorized-not-captured: use neutral/warning payment language; never `Refunded` or captured funds
- captured: only show captured/paid semantics when backend payment evidence says so
- cancellation action: render only from `cancellation.allowed`
- refund request action: render only from `refund_request.allowed`
- pending refund request: `Refund requested` / `Pending review`, never `Refund complete`
- missing fulfillment/tracking values: `Not available`, never generated events

## 6. Accessibility And Interaction

- semantic `button`, `a`, form labels and headings
- visible `:focus-visible` treatment using tokenized focus color
- modal focus trap, Escape close, labelled title/description, body scroll lock
- drawer semantics appropriate to modal/non-modal use
- buttons expose `aria-busy` while loading and prevent duplicate submits
- icon-only actions require accessible names and tooltips where unfamiliar
- errors connect to fields via `aria-describedby`
- status is not conveyed by color alone
- minimum touch target 44px for mobile controls

## 7. Responsive Rules

- PageShell uses stable max-width containers and explicit grid breakpoints.
- MobileShell reserves bottom navigation safe space.
- Cards become stacked layouts; fixed-format media uses aspect ratio.
- Buttons wrap or become full-width where labels cannot fit.
- Timeline switches from horizontal summary to vertical steps on narrow screens.
- Modals become bottom drawers only when the reference PNG indicates mobile sheet behavior.

## 8. FE-01 Adoption Plan

1. Introduce tokens and primitives without changing global page selectors.
2. Wrap `OrderHistoryCard` with shared `Card`, `MoneyText`, and `StatusBadge`.
3. Extract order-detail action controls to use shared buttons and Modal/TextArea while preserving current capability checks.
4. Add unit tests for formatting, tones, disabled/loading states, and action visibility.
5. Capture desktop/mobile screenshots for the two migrated surfaces.
6. Stop. Page-wide migrations belong to later FE batches.

## 9. Exit Criteria

- no backend/API contract changes
- no route changes
- no payment/refund semantic changes
- no nested-card regression
- two demonstration surfaces use the shell primitives
- old page CSS continues to function during migration
- typecheck/build/focused tests pass
- desktop/mobile screenshots show stable layout and no overlapping text

