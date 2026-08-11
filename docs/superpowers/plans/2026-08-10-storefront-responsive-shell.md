# Storefront Responsive Shell-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every buyer storefront page usable on desktop (≥981px) and phone (~390px) without whole-page horizontal scroll, by unifying the global shell first, then fixing layouts page-by-page (Option A only).

**Architecture:** Soft-unify breakpoints to `--buyer-bp-sm: 640px` and `--buyer-bp-lg: 980px`. Extend `PageShell` to own overflow control, sidebar collapse, and mounting of existing `MobileBottomNav`. Then audit/fix each page CSS batch (P0→P4) without redesigning mobile IA or visual brand.

**Tech Stack:** React 18 + Vite storefront (`apps/storefront`), CSS in `design-system.css` / page stylesheets, Jest + `react-dom/server` for component smoke tests.

**Spec:** `docs/superpowers/specs/2026-08-10-storefront-responsive-shell-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/storefront/src/styles/design-system.css` | Buyer breakpoint tokens; `PageShell` responsive width/sidebar/overflow/bottom-nav padding |
| `apps/storefront/src/components/layout/PageShell.tsx` | Shell props; mount `MobileBottomNav` |
| `apps/storefront/src/components/layout/PageShell.test.ts` | Shell prop / bottom-nav render tests |
| `apps/storefront/src/components/account/AccountAuthLayout.tsx` | Pass `cartCount` / `storeHref` / bottom-nav into `PageShell` |
| `apps/storefront/src/components/store-home/MobileBottomNav.tsx` | Existing bottom nav (mount only; minimal tweaks) |
| `apps/storefront/src/styles/store-home.css` | Top bar overflow/touch; bottom nav display; footer ≤640; shell padding helpers |
| `apps/storefront/src/pages/design/DesignerPage.tsx` | `showMobileBottomNav={false}` |
| `apps/storefront/src/pages/custom-designer/CustomDesignerPage.tsx` | `showMobileBottomNav={false}` |
| Other `*Page.tsx` using `PageShell` | Pass `cartCount` / `storeHref` when available |
| `apps/storefront/src/styles/product-detail.css` | P0 product dual-column fold |
| `apps/storefront/src/styles/cart.css` | P0 cart layout |
| `apps/storefront/src/styles/checkout.css` | P0 checkout layout |
| `apps/storefront/src/styles/account.css` | P3 account layout |
| `apps/storefront/src/styles/orders.css` | P4 orders layout |
| `apps/storefront/src/styles/app.css` / designer CSS | P1–P2 as needed |

---

### Task 1: Add buyer breakpoint tokens and harden `PageShell` CSS

**Files:**
- Modify: `apps/storefront/src/styles/design-system.css`

- [ ] **Step 1: Add buyer breakpoint tokens next to existing `--breakpoint-*`**

In `:root` of `design-system.css`, after the existing breakpoint tokens, add:

```css
  --buyer-bp-sm: 640px;
  --buyer-bp-lg: 980px;
```

Keep `--breakpoint-sm/md/lg/xl` unchanged (soft unification).

- [ ] **Step 2: Harden shell root overflow and update shell media from 760 → 980**

Replace the existing `@media (max-width: 760px)` block that targets `.buyer-ui-page-shell-content` with:

```css
.buyer-ui-page-shell {
  overflow-x: clip;
  max-width: 100%;
}

.buyer-ui-page-shell.has-mobile-bottom-nav {
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
}

@media (max-width: 980px) {
  .buyer-ui-page-shell-content {
    width: min(calc(100% - 32px), var(--buyer-content-width));
    padding-top: var(--buyer-space-6);
  }

  .buyer-ui-page-shell-content.has-sidebar {
    grid-template-columns: 1fr;
  }

  .buyer-ui-section-header {
    align-items: stretch;
    flex-direction: column;
  }

  .buyer-ui-modal-backdrop {
    align-items: end;
    padding: 0;
  }

  .buyer-ui-modal {
    width: 100%;
    max-height: calc(100vh - 24px);
    border-radius: var(--buyer-radius-card) var(--buyer-radius-card) 0 0;
  }

  .buyer-ui-modal-footer {
    flex-direction: column-reverse;
  }

  .buyer-ui-modal-footer .buyer-ui-button {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .buyer-ui-page-shell-content {
    width: min(calc(100% - 24px), var(--buyer-content-width));
    padding-top: var(--buyer-space-4);
    padding-bottom: var(--buyer-space-6);
  }
}
```

Preserve the existing `@media (prefers-reduced-motion: reduce)` block unchanged after these rules.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/styles/design-system.css
git commit -m "fix(storefront): add buyer breakpoints and harden PageShell CSS"
```

---

### Task 2: Extend `PageShell` to mount `MobileBottomNav` (TDD)

**Files:**
- Create: `apps/storefront/src/components/layout/PageShell.test.ts`
- Modify: `apps/storefront/src/components/layout/PageShell.tsx`
- Modify: `apps/storefront/src/components/account/AccountAuthLayout.tsx`

- [ ] **Step 1: Write failing tests for shell bottom-nav props**

Create `apps/storefront/src/components/layout/PageShell.test.ts`:

```ts
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PageShell } from "./PageShell"

jest.mock("../../auth/useBuyerAuth", () => ({
  useBuyerAuth: () => ({ customer: null, isLoading: false }),
}))

jest.mock("../../lib/buyer-api", () => ({
  getScopedBuyerStoreId: () => "default_store",
}))

jest.mock("../../lib/storefront-links", () => ({
  buildStoreMessagesHref: () => "/account/messages",
}))

describe("PageShell", () => {
  it("renders mobile bottom nav by default", () => {
    const html = renderToStaticMarkup(
      createElement(PageShell, { cartCount: 2 }, "content")
    )
    expect(html).toContain("buyer-mobile-bottom-nav")
    expect(html).toContain("has-mobile-bottom-nav")
    expect(html).toContain("Cart 2")
  })

  it("hides mobile bottom nav when disabled", () => {
    const html = renderToStaticMarkup(
      createElement(
        PageShell,
        { showMobileBottomNav: false, cartCount: 1 },
        "content"
      )
    )
    expect(html).not.toContain("buyer-mobile-bottom-nav")
    expect(html).not.toContain("has-mobile-bottom-nav")
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run:

```bash
cd apps/storefront && npm test -- --testPathPattern=PageShell --no-coverage
```

Expected: FAIL (props / markup not present yet).

- [ ] **Step 3: Implement `PageShell` props and mount**

Replace `apps/storefront/src/components/layout/PageShell.tsx` with:

```tsx
import type { ReactNode } from "react"
import { MobileBottomNav } from "../store-home/MobileBottomNav"

type PageShellProps = {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  sidebar?: ReactNode
  className?: string
  contentClassName?: string
  showMobileBottomNav?: boolean
  cartCount?: number
  storeHref?: string
}

export function PageShell({
  children,
  header,
  footer,
  sidebar,
  className = "",
  contentClassName = "",
  showMobileBottomNav = true,
  cartCount = 0,
  storeHref,
}: PageShellProps) {
  return (
    <div
      className={[
        "buyer-ui-page-shell",
        showMobileBottomNav ? "has-mobile-bottom-nav" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {header}
      <div
        className={[
          "buyer-ui-page-shell-content",
          sidebar ? "has-sidebar" : "",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {sidebar ? <aside className="buyer-ui-page-shell-sidebar">{sidebar}</aside> : null}
        <main className="buyer-ui-page-shell-main">{children}</main>
      </div>
      {footer}
      {showMobileBottomNav ? (
        <MobileBottomNav cartCount={cartCount} storeHref={storeHref} />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Wire `AccountAuthLayout`**

Update `apps/storefront/src/components/account/AccountAuthLayout.tsx` so `PageShell` receives cart/store props:

```tsx
import type { ReactNode } from "react"
import { StoreTopBar } from "../store-home/StoreTopBar"
import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { PageShell } from "../layout/PageShell"

export function AccountAuthLayout({
  settings,
  cartCount,
  marketplaceMode = false,
  storeHref,
  showMobileBottomNav = true,
  children,
}: {
  settings: BuyerStoreSettings
  cartCount: number
  marketplaceMode?: boolean
  storeHref?: string
  showMobileBottomNav?: boolean
  children: ReactNode
}) {
  return (
    <PageShell
      className="buyer-account-page"
      contentClassName="buyer-account-main"
      cartCount={cartCount}
      storeHref={storeHref}
      showMobileBottomNav={showMobileBottomNav}
      header={
        <StoreTopBar
          settings={settings}
          cartCount={cartCount}
          marketplaceMode={marketplaceMode}
          storeHref={storeHref}
        />
      }
    >
      {children}
    </PageShell>
  )
}
```

Only add `storeHref` to `StoreTopBar` if that prop already exists on `StoreTopBar`; if not, omit `storeHref` from the `StoreTopBar` call and keep it only on `PageShell` / `MobileBottomNav`.

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd apps/storefront && npm test -- --testPathPattern=PageShell --no-coverage
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/layout/PageShell.tsx \
  apps/storefront/src/components/layout/PageShell.test.ts \
  apps/storefront/src/components/account/AccountAuthLayout.tsx
git commit -m "feat(storefront): mount mobile bottom nav from PageShell"
```

---

### Task 3: Pass shell nav props from pages; disable on designer canvases

**Files:**
- Modify: every `PageShell` call site that already has `cartCount` in scope (see grep list below)
- Required opt-out:
  - `apps/storefront/src/pages/design/DesignerPage.tsx`
  - `apps/storefront/src/pages/custom-designer/CustomDesignerPage.tsx`

Known `PageShell` pages (pass `cartCount={cartCount}` and `storeHref={storeHref}` when those variables exist; otherwise `cartCount={cartCount}` only):

- `StoreHomePage.tsx`, `ProductDetailPage.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`, `CheckoutSuccessPage.tsx`, `PlatformCheckoutPage.tsx`
- `SearchPage.tsx`, `CategoriesPage.tsx`, `TrendsPage.tsx`, `MarketplaceHomePage.tsx`, `StudioLandingPage.tsx`
- `AiDesignPage.tsx`, `MyDesignsPage.tsx`, `SavedPage.tsx`
- `StoreMessagesPage.tsx`, order pages, `InfoPage.tsx`
- Designer pages: **also** `showMobileBottomNav={false}`

- [ ] **Step 1: Opt out designer shells**

On `DesignerPage` and `CustomDesignerPage` `PageShell` opening tags, add:

```tsx
showMobileBottomNav={false}
```

- [ ] **Step 2: Pass `cartCount` (and `storeHref` when available) on remaining `PageShell` usages**

Pattern:

```tsx
<PageShell
  /* existing props */
  cartCount={cartCount}
  storeHref={storeHref}
>
```

For pages without `storeHref`, omit it (bottom nav defaults to `/marketplace`).

Do **not** change page business logic.

- [ ] **Step 3: Typecheck**

```bash
cd apps/storefront && npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Manual smoke (DevTools)**

With `npm run dev:full` (or storefront `:5174`):

1. Desktop ≥1200: bottom nav hidden (`display: none` via existing CSS).
2. Width 390 on `/store` (or shop route): bottom nav visible; page content has bottom padding; no whole-page horizontal scroll.
3. Designer route: bottom nav absent.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/pages
git commit -m "fix(storefront): wire PageShell cartCount and disable designer bottom nav"
```

---

### Task 4: Top bar overflow / touch targets; footer ≤640; bottom-nav padding cleanup

**Files:**
- Modify: `apps/storefront/src/styles/store-home.css`

- [ ] **Step 1: Contain top bar horizontal strips**

Inside the existing `@media (max-width: 980px)` top-bar rules (near `.buyer-store-mainnav`), ensure:

```css
  .buyer-store-topbar,
  .buyer-store-toolbar {
    max-width: 100%;
  }

  .buyer-store-mainnav,
  .buyer-store-feature-nav,
  .buyer-store-social {
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
  }
```

Add only selectors that already exist; do not invent new class names.

- [ ] **Step 2: Touch targets for top-bar / bottom-nav links at ≤980**

Append inside `@media (max-width: 980px)`:

```css
  .buyer-store-actions a,
  .buyer-store-actions button,
  .buyer-mobile-bottom-nav a {
    min-height: 44px;
    min-width: 44px;
  }
```

- [ ] **Step 3: Align shell bottom padding with `has-mobile-bottom-nav`**

Find the block that only pads `.buyer-store-page` / `.buyer-product-page` mains when ≤980. Broaden so any shell with bottom nav is covered (avoid double-counting with Task 1 padding if both apply — prefer one clear rule):

```css
@media (max-width: 980px) {
  .buyer-ui-page-shell.has-mobile-bottom-nav .buyer-ui-page-shell-main {
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }
}
```

If Task 1 already set shell `padding-bottom`, remove redundant page-specific padding for store/product only to avoid huge empty gaps — keep **one** padding strategy (prefer main content padding so footers aren't oddly spaced).

- [ ] **Step 4: Confirm footer at ≤640 is single column**

Verify existing rules already include:

```css
@media (max-width: 640px) {
  .buyer-store-footer {
    grid-template-columns: 1fr;
  }

  .buyer-store-legal {
    flex-wrap: wrap;
  }

  .buyer-store-payments {
    margin-left: 0;
  }
}
```

If missing for a footer variant used by shop pages (e.g. `.buyer-mhome-page .buyer-store-footer`), add the same single-column/wrap rules for that variant.

- [ ] **Step 5: Manual check top bar + footer at 390 / 1200**

Expected: no page-level horizontal scroll on store home; footer stacks; bottom nav does not cover primary product grid CTA area.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/styles/store-home.css
git commit -m "fix(storefront): contain topbar overflow and unify mobile shell padding"
```

---

### Task 5: Phase 1 acceptance gate

**Files:** none (verification only)

- [ ] **Step 1: Run automated checks**

```bash
cd apps/storefront && npm test -- --testPathPattern='PageShell|account-components' --no-coverage && npm run typecheck
```

Expected: all PASS / exit 0.

- [ ] **Step 2: Checklist against spec §4.5**

On store home + one account auth page + one designer page:

| Check | 390px | ≥981px |
|-------|-------|--------|
| No whole-page horizontal scroll | | |
| Top bar usable | | |
| Bottom nav only ≤980 when enabled | | |
| Designer has no bottom nav | | |
| Sidebar (if any) single column ≤980 | | |

- [ ] **Step 3: Commit only if Step 2 forced tiny CSS fixes; otherwise skip**

If fixes were needed, commit them with message:

```bash
git commit -m "fix(storefront): Phase 1 responsive shell acceptance tweaks"
```

---

### Task 6: P0 — Store home + product detail layout

**Files:**
- Modify: `apps/storefront/src/styles/store-home.css`
- Modify: `apps/storefront/src/styles/product-detail.css`
- Optionally: `apps/storefront/src/pages/store/StoreHomePage.tsx`, `apps/storefront/src/pages/product/ProductDetailPage.tsx` (only if a wrapper is required for local overflow)

- [ ] **Step 1: Audit at 390px and ≥1200px**

Open store home and a product detail URL. Note failures against the five checklist items in the spec §5.2.

- [ ] **Step 2: Fix product detail dual pane**

In `product-detail.css`, ensure the main two-column layout (gallery + buy panel) becomes one column at ≤980. Pattern:

```css
@media (max-width: 980px) {
  .buyer-product-detail-layout /* use the real existing class name from the file */ {
    grid-template-columns: 1fr;
  }
}
```

Locate the actual dual-column selector (today includes rules like `grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr)` around the product layout). Change `minmax(360px, …)` bases to `minmax(0, 1fr)` on the desktop rule if they force overflow, and force `1fr` at ≤980.

- [ ] **Step 3: Fix sticky buy bar / bottom padding conflict**

If a sticky design/buy bar exists, ensure `bottom` accounts for mobile bottom nav when ≤980:

```css
@media (max-width: 980px) {
  .buyer-sticky-design-bar /* real class */ {
    bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  }
}
```

Use the real sticky class from `product-detail.css`.

- [ ] **Step 4: Store home grid / filters**

Confirm product grid is `repeat(2, minmax(0, 1fr))` at ≤980 (already present). Fix any filter/chip row that expands page width by wrapping it:

```css
  .buyer-shop-filters /* real class */ {
    max-width: 100%;
    overflow-x: auto;
  }
```

- [ ] **Step 5: Manual checklist §5.2 for these two pages**

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/styles/store-home.css apps/storefront/src/styles/product-detail.css
git commit -m "fix(storefront): responsive P0 store home and product detail"
```

---

### Task 7: P0 — Cart + checkout + success + platform checkout

**Files:**
- Modify: `apps/storefront/src/styles/cart.css`
- Modify: `apps/storefront/src/styles/checkout.css`
- Optionally page TSX if a scroll wrapper is required

- [ ] **Step 1: Audit cart + checkout at 390 / 1200**

- [ ] **Step 2: Cart — fold summary column**

Find the cart main grid (items + summary). At ≤980:

```css
@media (max-width: 980px) {
  .buyer-cart-layout /* real class */ {
    grid-template-columns: 1fr;
  }
}
```

Replace `minmax(Npx, …)` that causes overflow with `minmax(0, 1fr)` where needed.

- [ ] **Step 3: Checkout — fold form + order summary**

Same pattern in `checkout.css` for the checkout two-pane layout. Forms: inputs `width: 100%`; avoid fixed min-widths > viewport.

- [ ] **Step 4: Success + platform checkout**

Ensure success summary cards stack; platform checkout shell content uses full width at ≤980 without horizontal scroll.

- [ ] **Step 5: Manual checklist §5.2 for all four flows**

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/styles/cart.css apps/storefront/src/styles/checkout.css
git commit -m "fix(storefront): responsive P0 cart and checkout"
```

---

### Task 8: P1 — Discovery pages

**Files:**
- Modify as needed: `apps/storefront/src/styles/store-home.css`, `apps/storefront/src/styles/app.css`, and any page-specific classes used by:
  - `SearchPage.tsx`
  - `CategoriesPage.tsx`
  - `TrendsPage.tsx`
  - `MarketplaceHomePage.tsx`
  - `StudioLandingPage.tsx`

- [ ] **Step 1: Audit each discovery page at 390 / 1200**

- [ ] **Step 2: Fix filter/tag rows and grids**

For each overflowing strip:

```css
@media (max-width: 980px) {
  ./* real filter/tag container */ {
    max-width: 100%;
    overflow-x: auto;
  }
}
```

For grids still forcing 3+ columns on phone, set `repeat(2, minmax(0, 1fr))` or `1fr` at ≤980 / ≤640 as appropriate.

- [ ] **Step 3: Manual checklist §5.2 for all five pages**

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/styles
git commit -m "fix(storefront): responsive P1 discovery pages"
```

---

### Task 9: P2 — Design tools pages

**Files:**
- Modify: designer-related CSS (`apps/storefront/src/styles/` — locate `designer.css` or rules under `app.css` / `store-home.css` used by designer)
- Confirm opt-out already set on Designer + Custom Designer (`showMobileBottomNav={false}`)
- Pages: `AiDesignPage`, `DesignerPage`, `CustomDesignerPage`, `MyDesignsPage`, `SavedPage`

- [ ] **Step 1: Audit each at 390 / 1200**

- [ ] **Step 2: Canvas / flex children**

Anywhere a horizontal flex/grid child refuses to shrink:

```css
.designer-canvas-pane /* real class */,
.designer-workspace /* real class */ {
  min-width: 0;
  max-width: 100%;
}
```

Toolbar rows:

```css
@media (max-width: 980px) {
  .designer-toolbar /* real class */ {
    flex-wrap: wrap;
  }
}
```

- [ ] **Step 3: Confirm designer routes have no bottom nav**

- [ ] **Step 4: Manual checklist §5.2**

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/styles apps/storefront/src/pages
git commit -m "fix(storefront): responsive P2 design tool pages"
```

---

### Task 10: P3 — Account + auth pages

**Files:**
- Modify: `apps/storefront/src/styles/account.css`
- Pages use `AccountAuthLayout` or `PageShell` already

- [ ] **Step 1: Audit sign-in/register and account home/settings at 390 / 1200**

- [ ] **Step 2: Align account breakpoints to 980 / 640**

In `account.css`, change layout-breaking media queries from `860px` / `760px` to `980px` / `640px` **only when equivalent** (e.g. `.buyer-account-layout` stacking):

```css
@media (max-width: 980px) {
  .buyer-account-layout {
    /* keep existing stacked rules that currently live under 860px */
  }
}
```

Auth cards: `max-width: 100%`; avoid fixed widths > viewport.

- [ ] **Step 3: Manual checklist §5.2 for auth + account pages listed in spec §5.1 P3**

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/styles/account.css
git commit -m "fix(storefront): responsive P3 account and auth layouts"
```

---

### Task 11: P4 — Orders + info pages

**Files:**
- Modify: `apps/storefront/src/styles/orders.css`
- Modify: info-related styles (often `account.css` / `app.css` / `store-home.css` for `InfoPage`)
- Pages: order history/detail/tracking/lookup, `InfoPage`

- [ ] **Step 1: Audit each at 390 / 1200**

- [ ] **Step 2: Tables / timelines**

Prefer contained horizontal scroll over shrinking unreadably:

```css
@media (max-width: 980px) {
  .buyer-order-table-wrap /* real class */ {
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

Or stack detail grids to `1fr` at ≤980.

- [ ] **Step 3: Manual checklist §5.2 for all P4 pages**

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/styles/orders.css apps/storefront/src/styles
git commit -m "fix(storefront): responsive P4 orders and info pages"
```

---

### Task 12: Final verification gate

**Files:** none (or tiny follow-up CSS only)

- [ ] **Step 1: Full automated smoke**

```bash
cd apps/storefront && npm test -- --no-coverage && npm run typecheck
```

Expected: PASS / exit 0. If unrelated pre-existing failures appear, re-run only responsive-touched tests (`PageShell`, `account-components`) and note others — do not expand scope to fix unrelated suites unless blocking typecheck.

- [ ] **Step 2: Walk every page in spec §5.1 against §5.2 at 390 and ≥1200**

Mark done in the PR description / commit message body as a short checklist.

- [ ] **Step 3: Final commit if any last fixes**

```bash
git add apps/storefront
git commit -m "fix(storefront): finish responsive layout acceptance pass"
```

---

## Spec coverage self-check

| Spec requirement | Task(s) |
|------------------|---------|
| `--buyer-bp-sm` / `--buyer-bp-lg` | Task 1 |
| PageShell overflow, width, sidebar @980 | Task 1 |
| Mount MobileBottomNav via PageShell | Task 2–3 |
| AccountAuthLayout inherits nav | Task 2 |
| Designer opt-out | Task 3, 9 |
| Top bar overflow / 44px targets | Task 4 |
| Footer ≤640 single column | Task 4 |
| Phase 1 acceptance | Task 5 |
| P0–P4 page batches | Tasks 6–11 |
| Final success criteria | Task 12 |
| Non-goals (no beautify / no IA rewrite / no seller) | Enforced in all tasks |

## Notes for implementers

- Prefer CSS fixes; JSX only for wrappers or `PageShell` props.
- When a step says “real class”, open the stylesheet and use the existing selector — do not invent parallel class names.
- Do not mass-replace every `760`/`768` in the repo; only change queries you touch for a failing checklist item.
- Do not enable Visual / Printify beautification in this plan.
