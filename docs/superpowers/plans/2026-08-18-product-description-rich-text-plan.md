# Product Description Rich Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let sellers create formatted product descriptions and show the same formatting on buyer product pages while simplifying the details layout.

**Architecture:** Keep the existing `description` API field. The seller uses a small content-editable toolbar and stores limited HTML; the storefront sanitizes that HTML with a local allowlist before rendering. Product details become a single vertical flow, and the product page stops mounting its sticky design bar.

**Tech Stack:** React, TypeScript, Vite, Vitest/Jest, existing seller utility classes and storefront `Card` component.

---

### Task 1: Storefront description rendering and layout

**Files:**
- Create: `apps/storefront/src/lib/product-description.ts`
- Create: `apps/storefront/src/lib/product-description.test.ts`
- Modify: `apps/storefront/src/components/product-detail/ProductDetailsSection.tsx`
- Modify: `apps/storefront/src/components/product-detail/ProductDetailsSection.test.ts`
- Modify: `apps/storefront/src/pages/product/ProductDetailPage.tsx`

- [ ] **Step 1: Write failing sanitizer tests**

Test `sanitizeProductDescription` with `<p>Hello <strong>world</strong></p><script>alert(1)</script>` and assert the result keeps the paragraph and strong tag but removes the script. Test plain text with a newline and assert it remains readable without introducing unsafe markup.

- [ ] **Step 2: Run the sanitizer test and verify it fails**

Run `npm --workspace apps/storefront test -- --runInBand src/lib/product-description.test.ts`.
Expected: FAIL because `product-description.ts` does not exist.

- [ ] **Step 3: Implement the allowlist sanitizer**

Export `sanitizeProductDescription(value: string): string`. Escape text when no allowed HTML tags are present; otherwise parse the limited markup with a small token-based allowlist that keeps only `p`, `br`, `strong`, `b`, `em`, `i`, `ul`, `ol`, and `li`, strips all attributes, and removes comments/scripts/styles and their contents. Do not add a dependency for this narrow field.

- [ ] **Step 4: Add failing component assertions**

Extend `ProductDetailsSection.test.ts` to assert the rendered HTML contains `Description`, does not contain `Details`, contains sanitized `<strong>`, and places the description block before the `<dl>` details table. Use a description containing an unsafe script to prove the component does not render it.

- [ ] **Step 5: Run the component test and verify the new assertions fail**

Run `npm --workspace apps/storefront test -- --runInBand src/components/product-detail/ProductDetailsSection.test.ts`.
Expected: FAIL on the old heading/layout/description markup.

- [ ] **Step 6: Implement the storefront layout and rendering**

Render a `div` with a `data-testid`-free semantic description block first, with heading `Description` and sanitized HTML, followed by the existing `Card as="dl"`. Add the local class needed by the existing stylesheet if required, preserving all supplier fields. Remove the `StickyDesignBar` import and JSX block from `ProductDetailPage.tsx`.

- [ ] **Step 7: Run storefront tests and typecheck**

Run `npm --workspace apps/storefront test -- --runInBand src/lib/product-description.test.ts src/components/product-detail/ProductDetailsSection.test.ts` and `npm --workspace apps/storefront run typecheck`.
Expected: PASS and no TypeScript errors.

### Task 2: Seller draft rich-text editor

**Files:**
- Create: `apps/seller-dashboard/src/components/products/ProductDescriptionEditor.tsx`
- Create: `apps/seller-dashboard/src/components/products/ProductDescriptionEditor.test.tsx`
- Modify: `apps/seller-dashboard/src/pages/Products/EditDraft.tsx`

- [ ] **Step 1: Write failing editor tests**

Render `ProductDescriptionEditor` with a plain-text value and assert it exposes a content-editable region plus buttons named `Paragraph`, `Bold`, `Italic`, `Bulleted list`, and `Numbered list`. Assert the initial text is present and that an input event emits the editor HTML through `onChange`.

- [ ] **Step 2: Run the editor test and verify it fails**

Run `npm --workspace apps/seller-dashboard test -- ProductDescriptionEditor.test.tsx`.
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the minimal editor**

Use a `contentEditable` div initialized from `value`, a toolbar of `type="button"` controls, and `document.execCommand` for `formatBlock`, `bold`, `italic`, `insertUnorderedList`, and `insertOrderedList`. Emit `innerHTML` on input and sync external value changes. Disable controls when `disabled` is true. Keep labels accessible and preserve the existing field dimensions with the seller dashboard utility classes.

- [ ] **Step 4: Replace the draft textarea**

Import `ProductDescriptionEditor` in `EditDraft.tsx` and replace only the description `Textarea`, passing `description`, `setDescription`, and `isArchived`. Keep the translation button and `buildPayload` field unchanged so formatted HTML reaches the existing `description` property.

- [ ] **Step 5: Run seller tests and build**

Run `npm --workspace apps/seller-dashboard test -- ProductDescriptionEditor.test.tsx` and `npm --workspace apps/seller-dashboard run build`.
Expected: PASS and a successful Vite build.

### Task 3: Cross-frontend verification

**Files:**
- Inspect only: seller and storefront files changed above.

- [ ] **Step 1: Run both targeted test suites again**

Run the two storefront test commands and seller editor test command from Tasks 1 and 2.

- [ ] **Step 2: Check the diff and status**

Run `git diff --check` and `git status --short`. Confirm no unrelated files changed and the product detail page no longer imports or renders `StickyDesignBar`.
