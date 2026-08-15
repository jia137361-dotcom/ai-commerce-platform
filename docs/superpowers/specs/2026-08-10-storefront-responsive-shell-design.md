# Storefront Responsive Layout (Shell-First) Design

**Date:** 2026-08-10  
**Scope:** Buyer storefront only (`apps/storefront`)  
**Standard:** Layout adaptation only (Option A) — no visual redesign, no mobile IA rewrite  
**Approach:** Soft unification (canonical `640` / `980`), global shell first, then page-by-page fixes

---

## 1. Goals

- Desktop (≥981px) and phone (≈390px width) layouts work without whole-page horizontal scroll.
- Dual-column / sidebar layouts collapse correctly on narrow viewports.
- Text and primary controls remain readable and tappable (≥44px touch targets where shell controls apply).
- Sticky chrome (top bar, optional bottom nav) must not permanently hide primary CTAs.

## 2. Non-goals

- Visual beautification (fonts, brand colors, Printify-style marketing polish).
- Redesigning mobile information architecture (new nav model, checkout step rewrite, etc.).
- Hard-cut of all media queries to `768` / `1024`.
- Seller dashboard or other apps.
- i18n / branding consistency work (tracked separately).

## 3. Canonical breakpoints (soft unification)

| Token | Value | Role |
|-------|-------|------|
| `--buyer-bp-sm` | `640px` | Compact phone: tighter spacing, hide secondary chrome |
| `--buyer-bp-lg` | `980px` | Phone / narrow tablet: primary shell switch |

Rules:

- New shell and page responsive CSS should prefer these two breakpoints.
- Existing `design-system` tokens `--breakpoint-md` (`768`) and `--breakpoint-lg` (`1024`) may remain for legacy references; map documentation to buyer tokens rather than mass-replacing in Phase 1.
- `PageShell` media currently at `760px` moves to `980px` (`--buyer-bp-lg`).
- When touching a page stylesheet in Phase 2, opportunistically align stray `760` / `768` / `860` / `900` queries to `640` or `980` only if behavior stays equivalent.

## 4. Phase 1 — Global shell

### 4.1 `PageShell`

File: `apps/storefront/src/components/layout/PageShell.tsx`  
Styles: `apps/storefront/src/styles/design-system.css` (and related shell rules)

- Root shell: prevent page-level horizontal overflow (`overflow-x: clip` or equivalent on the shell root / `body` via shell class).
- Content width:
  - Desktop: keep `min(calc(100% - 48px), var(--buyer-content-width))`.
  - `≤980`: tighter horizontal inset (e.g. `100% - 32px`).
  - `≤640`: keep compact vertical padding.
- Sidebar: `has-sidebar` becomes single column at `≤980`.
- Props:
  - `showMobileBottomNav?: boolean` (default `true`).
  - Pass through `cartCount` / `storeHref` as needed for bottom nav.
- When bottom nav is visible (`≤980` and prop enabled): reserve bottom padding on main content including `safe-area-inset-bottom`.

### 4.2 Top bar — `StoreTopBar`

- Keep existing collapse behavior at `≤980` / `≤640` (ship-to hide, account label hide, language hide, toolbar stack).
- Fix overflow: horizontal scroll regions (main nav, feature nav, social) must be contained; must not expand page width.
- Ensure interactive controls meet ~44px minimum height/width where practical without redesigning icons.

### 4.3 Bottom nav — `MobileBottomNav`

- Component and CSS already exist; **not mounted on any page today**.
- Phase 1 mounts it via `PageShell` for viewports `≤980` when `showMobileBottomNav` is true.
- `AccountAuthLayout` uses `PageShell`, so auth pages inherit the same behavior.
- Disable by default on full-canvas designer routes (Designer, Custom Designer, and any page that opts out) so the canvas is not covered.

### 4.4 Footer — `StoreFooter`

- `≤980`: two-column grid (existing pattern).
- `≤640`: single column; payment / legal row wraps without horizontal page overflow.

### 4.5 Phase 1 acceptance

On desktop ≥981px and phone ≤390px width:

1. No whole-page horizontal scrollbar on a representative shell page (e.g. store home).
2. Top bar remains usable; overflow sections scroll locally if needed.
3. Bottom nav appears only ≤980 when enabled; primary content not permanently obscured.
4. Sidebar layouts collapse to one column ≤980.

## 5. Phase 2 — Page-by-page layout fixes

Apply Option A checks only. Prefer CSS changes; JSX only when structure blocks folding (e.g. missing wrapper for local horizontal scroll).

### 5.1 Batches

| Batch | Pages | Focus |
|-------|-------|--------|
| **P0** | Store home, Product detail, Cart, Checkout, Checkout success, Platform checkout | Dual→single column, sticky buy bars, summary cards, full-width forms |
| **P1** | Search, Categories, Trends, Marketplace (browse history), Studio landing | Filter bars, grid columns, empty states |
| **P2** | AI Design, Designer, Custom Designer, My Designs, Saved | Toolbar wrap; disable bottom nav on full-screen tools; canvas `min-width: 0` |
| **P3** | Sign-in / Register / Forgot / Reset / Verify email, Account home / Profile / Settings / Plans / Messages | Auth card width; account nav stack |
| **P4** | Order history / detail / tracking / lookup, Info pages | Tables/timelines → card or contained horizontal scroll |

### 5.2 Per-page checklist

1. No whole-page horizontal scroll; any intentional horizontal strip is inside `overflow-x: auto`.
2. Grids / dual panes fold correctly at `≤980` (product grids may stay 2 columns on phone if already intended).
3. Primary buttons / inputs not covered by bottom nav or sticky bars.
4. Text and controls remain readable/tappable.
5. Desktop layout has no obvious regression.

### 5.3 Delivery

1. Land Phase 1 shell PR (or commit series) first.
2. Then P0 → P4 batches with the checklist above per batch.

## 6. Architecture notes

- Most buyer pages already wrap with `PageShell` + `StoreTopBar` (+ often `StoreFooter`).
- Account flows use `AccountAuthLayout` → `PageShell` without footer; Phase 1 still applies top bar + optional bottom nav.
- `MobileShell` remains available but is **not** the primary path for this initiative (avoids dual-shell maintenance).
- Do not invent a separate mobile route tree.

## 7. Testing

- Manual: Chrome DevTools device mode at ~390px and desktop ≥1200px for each touched page.
- Spot-check iOS Safari safe-area if bottom nav is enabled (padding with `env(safe-area-inset-bottom)`).
- No requirement for visual snapshot suite in this phase; optional smoke of existing Jest component tests if shell props change.

## 8. Success criteria

- Phase 1 shell acceptance (section 4.5) passes.
- Every storefront page in section 5.1 has been checked against section 5.2 at phone + desktop widths.
- No intentional scope creep into beautification or IA redesign.
