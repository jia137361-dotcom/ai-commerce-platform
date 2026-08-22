# Seller Variant Label Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let sellers rename S2B-derived color and size labels inline and reset only those labels to S2B defaults while preserving enabled selections.

**Architecture:** Add a pure seller-dashboard helper for grouped label updates and supplier-default restoration. Keep supplier variant IDs and the existing product PUT payload unchanged; update only the local `variants` state before save. Add inline editing controls to the existing S2B variant section in `EditDraft.tsx`.

**Tech Stack:** React, TypeScript, Vitest/Jest-compatible seller dashboard tests, existing Tailwind-style classes and shared `ProductVariantRow` type.

---

### Task 1: Add failing tests for variant label operations

**Files:**
- Create: `apps/seller-dashboard/src/lib/variant-labels.test.ts`
- Create: `apps/seller-dashboard/src/lib/variant-labels.ts`

- [ ] **Step 1: Write tests for grouped rename, default reset, and empty labels**

Test `renameVariantLabel` with two color variants sharing `白色` and one `黑色`; expect both white rows to become `White`, while IDs, sizes, prices, and enabled flags remain unchanged. Test `resetVariantLabels` with supplier defaults keyed by `supplier_variant_id`; expect only color/size labels to change and disabled rows to remain disabled. Test blank replacement returns the original rows unchanged.

- [ ] **Step 2: Run the focused test and verify it fails for the missing helper**

Run: `npm --workspace apps/seller-dashboard run test -- --runInBand src/lib/variant-labels.test.ts`

Expected: FAIL because `variant-labels.ts` does not yet export the requested helpers.

- [ ] **Step 3: Implement the minimal pure helpers**

Export `renameVariantLabel(variants, dimension, from, to)` and `resetVariantLabels(variants, supplierDefaults, dimension)`. `renameVariantLabel` trims and rejects an empty target; it updates only rows whose selected dimension equals `from`. `resetVariantLabels` looks up each row by supplier variant ID and changes only the requested dimension when a default exists; it preserves every other field.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm --workspace apps/seller-dashboard run test -- --runInBand src/lib/variant-labels.test.ts`

Expected: PASS.

### Task 2: Integrate inline editing and reset controls into Product Edit

**Files:**
- Modify: `apps/seller-dashboard/src/pages/Products/EditDraft.tsx`

- [ ] **Step 1: Add editing state and supplier-default maps**

Track the currently edited dimension/value, draft text, and original text. Build color and size default maps from `supplierData.supplier_products[*].variants`, keyed by `supplier_variant_id`, using `color_name ?? color` and `size_name ?? size`.

- [ ] **Step 2: Add inline commit/cancel handlers**

When a color or size pill is clicked, enter edit mode without toggling selection. Enter or the inline save button calls the pure rename helper across matching rows; Escape or cancel restores the display state. Empty input shows the existing toast and keeps the prior value.

- [ ] **Step 3: Add reset buttons that preserve enabled state**

Add compact `Reset colors` and `Reset sizes` buttons beside the section counts. Each calls the pure reset helper with supplier defaults and only updates `color` or `size`; do not call the toggle handlers or alter selected images.

- [ ] **Step 4: Render editing controls accessibly**

Use an input with an accessible label, Enter handling, Escape handling, and explicit Save/Cancel buttons. Keep the existing pill click behavior for non-edit clicks and disable editing controls for archived products.

- [ ] **Step 5: Run seller dashboard tests and TypeScript validation**

Run: `npm --workspace apps/seller-dashboard run test -- --runInBand src/lib/variant-labels.test.ts`

Run: `npx tsc --noEmit -p apps/seller-dashboard/tsconfig.json`

Expected: all focused tests pass and TypeScript reports no errors.

### Task 3: Final verification and review

**Files:**
- Verify: `apps/seller-dashboard/src/pages/Products/EditDraft.tsx`
- Verify: `apps/seller-dashboard/src/lib/variant-labels.ts`

- [ ] **Step 1: Run formatting/diff checks**

Run: `git diff --check`.

- [ ] **Step 2: Run the relevant seller dashboard test suite**

Run: `npm --workspace apps/seller-dashboard run test -- --runInBand src/lib/variant-labels.test.ts src/lib/product-fulfillment-status.test.ts`

- [ ] **Step 3: Review behavior against the agreed design**

Confirm that renaming a label updates all matching combinations, reset changes text only, enabled/disabled selections remain unchanged, and the existing save/publish path persists the edited variants.
