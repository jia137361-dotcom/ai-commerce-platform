# Payment Amount Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make checkout display, Medusa totals, Stripe/PayPal charges, completed orders, refunds, and payouts use one canonical major-unit amount.

**Architecture:** Medusa 2.14 major-unit values become canonical at product, cart, adjustment, payment, order, and API boundaries. A server-side pricing synchronizer writes coupon and plan discounts as idempotent Medusa line-item adjustments before payment preparation, while provider adapters alone convert to Stripe minor units or PayPal decimal strings. Order completion becomes recoverable once an order exists, and a guarded one-time migration converts only catalog and unpaid transactional data.

**Tech Stack:** TypeScript, Medusa 2.14 modules/workflows, PostgreSQL, Stripe test mode, PayPal sandbox, React/Vite, Jest.

---

## File Map

- Create `apps/medusa-backend/src/lib/money.ts`: currency-aware major/minor conversion and equality assertions.
- Create `apps/medusa-backend/src/lib/sync-cart-checkout-pricing.ts`: synchronize discount adjustments and return the canonical cart snapshot.
- Create `apps/medusa-backend/src/lib/payment-amount-contract.ts`: validate cart, collection, session, and external provider amounts.
- Create `apps/medusa-backend/src/scripts/migrate-medusa-money-major-units.ts`: guarded dry-run/apply migration for catalog and open carts.
- Modify product/cart/shipping entry points to stop multiplying major amounts by 100.
- Modify payment recovery/readiness to synchronize pricing before creating sessions and reject mismatches.
- Modify PayPal serialization to accept major units directly; remove Stripe post-creation correction.
- Modify cart completion and attempt expiry so created orders are always recoverable and completed attempts are terminal.
- Modify order/refund/payout readers to use captured major-unit values and convert only at Stripe transfer boundary.
- Modify storefront cart normalization to stop dividing Medusa major-unit values by 100.

### Task 1: Canonical Money Contract

**Files:**
- Create: `apps/medusa-backend/src/lib/money.ts`
- Create: `apps/medusa-backend/src/__tests__/money.test.ts`

- [ ] **Step 1: Write failing conversion and equality tests**

```ts
import { majorToProviderMinor, moneyEquals, normalizeMajor } from "../lib/money"

test("HKD 180.44 converts to Stripe 18044 exactly once", () => {
  expect(normalizeMajor(180.44, "hkd")).toBe(180.44)
  expect(majorToProviderMinor(180.44, "hkd")).toBe(18044)
})

test("money equality uses currency precision", () => {
  expect(moneyEquals(180.44, 180.4400001, "hkd")).toBe(true)
  expect(moneyEquals(180.44, 180.45, "hkd")).toBe(false)
})
```

- [ ] **Step 2: Run the test and verify missing-module failure**

Run: `npm --workspace apps/medusa-backend test -- --runInBand src/__tests__/money.test.ts`

Expected: FAIL because `../lib/money` does not exist.

- [ ] **Step 3: Implement currency-aware helpers**

Use explicit exponent tables for zero- and three-decimal currencies, reject negative/non-finite values, and round with decimal precision. Do not infer units from magnitude.

- [ ] **Step 4: Run tests and commit**

Run: `npm --workspace apps/medusa-backend test -- --runInBand src/__tests__/money.test.ts`

Expected: PASS.

Commit: `git commit -m "Define canonical Medusa money units"`

### Task 2: Guarded Legacy Data Migration

**Files:**
- Create: `apps/medusa-backend/src/lib/legacy-money-migration.ts`
- Create: `apps/medusa-backend/src/__tests__/legacy-money-migration.test.ts`
- Create: `apps/medusa-backend/src/scripts/migrate-medusa-money-major-units.ts`
- Modify: `apps/medusa-backend/package.json`

- [ ] **Step 1: Write failing row-classification tests**

Cover active price-set values, incomplete cart line items, incomplete cart shipping methods, and payment rows with no authorized/captured/processing provider state. Assert that completed carts, orders, captures, refunds, and successful provider sessions are excluded.

```ts
expect(classifyLegacyCart({ completed_at: null, payment_status: "pending" })).toBe("convert")
expect(classifyLegacyCart({ completed_at: new Date(), payment_status: "completed" })).toBe("protect")
expect(classifyLegacySession({ status: "authorized" })).toBe("protect")
```

- [ ] **Step 2: Observe test failure, then implement pure classifiers**

Run: `npm --workspace apps/medusa-backend test -- --runInBand src/__tests__/legacy-money-migration.test.ts`

Expected before implementation: FAIL. Expected after implementation: PASS.

- [ ] **Step 3: Implement transactional dry-run/apply script**

The script must:

1. Acquire a PostgreSQL advisory lock.
2. Create/read marker `citigoo_medusa_major_units_v1` in an application migration marker table.
3. Print counts and protected-row counts without values or credentials by default.
4. Abort when ambiguous active rows exist.
5. On `--apply`, divide eligible legacy numeric/raw numeric values by the currency exponent and update the marker in the same transaction.
6. Roll back on any error.

Add script: `"money:migrate-major": "medusa exec ./src/scripts/migrate-medusa-money-major-units.ts"`.

- [ ] **Step 4: Run dry-run twice and assert no writes**

Run: `npm --workspace apps/medusa-backend run money:migrate-major`

Expected: eligible/protected counts printed; database marker absent; no changed rows.

- [ ] **Step 5: Commit migration tooling without applying it yet**

Commit: `git commit -m "Add guarded Medusa money migration"`

### Task 3: Major Units At Product, Cart, Shipping, And Storefront Boundaries

**Files:**
- Modify: `apps/medusa-backend/src/lib/native-product-bridge.ts`
- Modify: `apps/medusa-backend/src/workflows/add-line-item.ts`
- Modify: `apps/medusa-backend/src/api/store/carts/[id]/shipping-methods/route.ts`
- Modify: `apps/medusa-backend/src/api/store/carts/[id]/shipping-options/route.ts`
- Modify: `apps/storefront/src/lib/buyer-api.ts`
- Modify tests: `product-cart-bridge.test.ts`, `cart-shipping-routes.test.ts`, `buyer-api-payment-recovery.test.ts`, cart/checkout summary tests.

- [ ] **Step 1: Change fixture expectations to major units**

Assert a source price `233.92` creates a Medusa variant/cart line `233.92`, shipping `5.00`, and storefront values remain `233.92`/`5.00` without division.

- [ ] **Step 2: Run focused suites and observe legacy expectations fail**

Run: `npm --workspace apps/medusa-backend test -- --runInBand src/__tests__/product-cart-bridge.test.ts src/__tests__/cart-shipping-routes.test.ts`

Run: `npm --workspace apps/storefront test -- --runInBand src/lib/buyer-api-payment-recovery.test.ts src/components/checkout/CheckoutSummaryCard.test.ts`

- [ ] **Step 3: Remove boundary `* 100` and `/ 100` conversions**

Keep supplier/source prices in major units. Return shipping `amount` in major units. Delete `fromCartMinorUnits`; normalize cart line prices with the standard finite-number reader.

- [ ] **Step 4: Run focused suites and commit**

Expected: all focused tests PASS.

Commit: `git commit -m "Use Medusa major units in carts and shipping"`

### Task 4: Native Discount Adjustments And Canonical Pricing Snapshot

**Files:**
- Create: `apps/medusa-backend/src/lib/sync-cart-checkout-pricing.ts`
- Modify: `apps/medusa-backend/src/lib/store-coupons.ts`
- Modify: `apps/medusa-backend/src/api/store/carts/[id]/coupons/route.ts`
- Modify: `apps/medusa-backend/src/lib/ensure-cart-payment-ready.ts`
- Modify tests: `store-coupons-pricing.test.ts`, `ensure-cart-payment-ready.test.ts`

- [ ] **Step 1: Write failing canonical-total tests**

Given merchandise `233.92`, shipping `5.00`, and plan discount `58.48`, assert:

```ts
expect(snapshot).toMatchObject({
  merchandiseTotal: 233.92,
  shippingTotal: 5,
  discountTotal: 58.48,
  payableTotal: 180.44,
  currencyCode: "hkd",
})
```

Assert the synchronizer calls `setLineItemAdjustments` with stable code `citigoo-checkout-discount`, replaces rather than duplicates the adjustment, and removes it when discount becomes zero.

- [ ] **Step 2: Run tests and verify they fail before production edits**

Run: `npm --workspace apps/medusa-backend test -- --runInBand src/__tests__/store-coupons-pricing.test.ts src/__tests__/ensure-cart-payment-ready.test.ts`

- [ ] **Step 3: Implement adjustment synchronization under cart lock**

Distribute the discount deterministically across discountable merchandise lines without exceeding a line subtotal. Reload the calculated cart after adjustments and use its total as `payableTotal`. Call the synchronizer before creating/updating a payment collection.

- [ ] **Step 4: Run focused tests and commit**

Commit: `git commit -m "Apply checkout discounts to Medusa totals"`

### Task 5: Provider Amount Assertions

**Files:**
- Create: `apps/medusa-backend/src/lib/payment-amount-contract.ts`
- Modify: `apps/medusa-backend/src/api/store/carts/[id]/payment-recovery/route.ts`
- Modify: `apps/medusa-backend/src/modules/paypal/client.ts`
- Modify: `apps/medusa-backend/src/modules/paypal/service.ts`
- Modify tests: `payment-recovery-route.test.ts`, `paypal-provider.test.ts`, `ensure-cart-payment-ready.test.ts`.

- [ ] **Step 1: Write failing Stripe and PayPal contract tests**

Assert cart, collection, and session all equal `180.44`; Stripe external amount equals `18044`; PayPal decimal equals `"180.44"`. Assert mismatches return a typed `PAYMENT_AMOUNT_MISMATCH` error before exposing a client secret/order ID.

- [ ] **Step 2: Run tests and observe failures**

Run: `npm --workspace apps/medusa-backend test -- --runInBand src/__tests__/payment-recovery-route.test.ts src/__tests__/paypal-provider.test.ts src/__tests__/ensure-cart-payment-ready.test.ts`

- [ ] **Step 3: Implement assertions and remove Stripe correction**

Delete the direct `POST /payment_intents/{id}` amount repair. Retrieve and compare the PaymentIntent after Medusa creates/updates it. Make PayPal `decimalAmount` treat input as major units and format by currency exponent.

- [ ] **Step 4: Run focused tests and commit**

Commit: `git commit -m "Enforce provider payment amount contract"`

### Task 6: Order Completion And Attempt Recovery

**Files:**
- Modify: `apps/medusa-backend/src/api/store/carts/[id]/complete/route.ts`
- Modify: `apps/medusa-backend/src/lib/checkout-payment-attempts.ts`
- Modify: `apps/medusa-backend/src/api/store/customers/me/orders/route.ts`
- Modify: `apps/storefront/src/pages/checkout/CheckoutPage.tsx`
- Modify tests: `cart-complete-route.test.ts`, `customer-orders-route.test.ts`, `checkout-payment.test.ts`, `checkout-action.test.ts`.

- [ ] **Step 1: Write failing recovery tests**

Cover: core workflow returns an order and later fulfillment metadata work throws; response still returns 200 with that order. A retry returns the existing `checkout_cart_id` order. A completed attempt with an expired timestamp remains completed. Frontend recovery with `completedOrderId` navigates to `/checkout/success`.

- [ ] **Step 2: Run focused backend/frontend tests and observe failures**

Run: `npm --workspace apps/medusa-backend test -- --runInBand src/__tests__/cart-complete-route.test.ts src/__tests__/customer-orders-route.test.ts`

Run: `npm --workspace apps/storefront test -- --runInBand src/pages/checkout/checkout-payment.test.ts src/pages/checkout/checkout-action.test.ts`

- [ ] **Step 3: Establish the order-created commit point**

Immediately after `completeCartWorkflow` returns, persist `completed_order_id` and terminal status. Wrap optional post-complete operations independently and log failures with order/cart IDs. On catch, search for the existing order before returning an error. Expiry code must skip terminal attempts and any attempt with `completed_order_id`.

- [ ] **Step 4: Make storefront recovery consume completed order IDs**

Use one success-finalization function for normal complete and recovered complete responses so storage cleanup and redirect are identical.

- [ ] **Step 5: Run focused tests and commit**

Commit: `git commit -m "Recover completed checkout orders safely"`

### Task 7: Orders, Refunds, And Seller Payouts

**Files:**
- Modify: `apps/medusa-backend/src/lib/buyer-order-totals.ts`
- Modify: `apps/medusa-backend/src/api/store/orders/[id]/detail/route.ts`
- Modify: `apps/medusa-backend/src/lib/order-refund-request.ts`
- Modify: `apps/medusa-backend/src/lib/seller-order-payout.ts`
- Modify: `apps/storefront/src/lib/buyer-api.ts`
- Modify tests: buyer order totals, order detail, refund requests/execution, seller payout.

- [ ] **Step 1: Change tests to major-unit captured totals**

Assert order total, captured amount, full refundable amount, and payout source are `180.44`. Assert Stripe transfer payload is `18044` exactly once.

- [ ] **Step 2: Run tests and observe current minor-unit assumptions fail**

- [ ] **Step 3: Remove order-display divisions and metadata overrides**

Read Medusa summary/payment/capture major values directly. Use captured payment as refund and payout authority. Convert payout to provider minor units only while constructing the Stripe transfer request.

- [ ] **Step 4: Run suites and commit**

Commit: `git commit -m "Align orders refunds and payouts with captured totals"`

### Task 8: Apply Migration And Verify Closure

**Files:**
- Update documentation only if verification reveals a command or operational prerequisite missing from the design.

- [ ] **Step 1: Stop payment testing and run migration dry-run**

Record eligible/protected/ambiguous counts. Do not proceed if ambiguous is non-zero.

- [ ] **Step 2: Back up eligible rows and apply migration once**

Run the migration with `--apply`, then run it again and verify marker-based no-op behavior. Query order `#43` afterward and verify its order, payment, capture, and transfer rows are unchanged.

- [ ] **Step 3: Run backend payment regression suites**

Run all payment, coupon, cart complete, refund, payout, and customer order tests with `--runInBand`.

- [ ] **Step 4: Run storefront checkout suites, typecheck, and builds**

Run `npm --workspace apps/storefront test -- --runInBand`.

Run `npm --workspace apps/storefront run typecheck`.

Run `npm --workspace apps/medusa-backend run build`.

- [ ] **Step 5: Run sandbox smoke without creating a live charge**

Create a fresh migrated cart and verify logs/API state for the same canonical amount through cart, adjustment, collection, session, and provider object. Use Stripe test mode and PayPal sandbox only. Verify successful complete redirects and interrupted complete recovers without a second provider payment.

- [ ] **Step 6: Review diff and commit verified closure**

Run `git diff --check`, `git status -sb`, and inspect all payment-related diffs. Commit only the verified implementation and migration artifacts.

Commit: `git commit -m "Repair canonical checkout payment pipeline"`
