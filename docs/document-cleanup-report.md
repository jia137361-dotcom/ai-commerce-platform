# Document Cleanup Report

Date: 2026-06-20

## Policy

No document was deleted in this pass. `archive` means useful historical evidence that should eventually move under a clearly named archive folder or receive a historical banner. `delete_candidate` means obvious duplication, but still requires an explicit deletion decision. Current implementation and API facts take precedence over old gap/plan statements.

## New Authority Set

| File | Decision | Reason | Replacement / relation |
|---|---|---|---|
| `docs/project-current-state-and-roadmap.md` | keep | Single current product/implementation plan | Primary planning entry |
| `docs/buyer-frontend-design-progress-audit.md` | keep | Current design-to-route/data audit | Detail for roadmap Phases 2-6 |
| `docs/backend-capability-map.md` | keep | Current buyer API/domain status | Backend authority map |
| `docs/document-cleanup-report.md` | keep | Controls document lifecycle | This report |

## Buyer Planning And Inventory

| File path | Decision | Reason | Replacement document |
|---|---|---|---|
| `docs/buyer-api-contract.md` | archive | Early P0 contract marks address/order list/detail/shipping as missing, now implemented | `backend-capability-map.md` plus subsystem contracts |
| `docs/buyer-design-inventory.md` | historical_reference | Still useful as PNG filename inventory | `buyer-frontend-design-progress-audit.md` for current status |
| `docs/buyer-frontend-current-state.md` | archive | Snapshot predates auth, completed checkout, authenticated orders, cancellation, refund request | `project-current-state-and-roadmap.md` |
| `docs/buyer-frontend-current-state 2.md` | delete_candidate | Obvious duplicate filename and stale snapshot; no unique authority identified | `project-current-state-and-roadmap.md` |
| `docs/buyer-frontend-rebuild-plan.md` | archive | Batch 0-8 implementation plan has largely executed; later planning has changed | `project-current-state-and-roadmap.md` |
| `docs/buyer-page-api-map.md` | archive | Useful historical mapping but stale for auth/order/cancel/refund/payment | `buyer-frontend-design-progress-audit.md`, `backend-capability-map.md` |
| `docs/storefront-runtime-readiness.md` | historical_reference | Runtime setup evidence remains useful | Roadmap for current product planning |

## Design Notes

| File path | Decision | Reason | Replacement / relation |
|---|---|---|---|
| `docs/buyer-product-detail-design-notes.md` | historical_reference | Detailed interpretation of `单店` PNG states | Referenced by frontend audit |
| `docs/buyer-cart-design-notes.md` | historical_reference | Detailed cart state interpretation | Referenced by frontend audit |
| `docs/buyer-checkout-design-notes.md` | historical_reference | Detailed checkout/address PNG interpretation | Referenced by frontend audit |
| `docs/buyer-order-tracking-design-notes.md` | historical_reference | Tracks order/tracking image classification | Referenced by frontend audit |
| `docs/buyer-order-detail-design-notes.md` | historical_reference | Detail state classification remains useful | Referenced by frontend audit |
| `docs/buyer-order-history-design-notes.md` | historical_reference | Order list/tab design evidence | Referenced by frontend audit |
| `docs/buyer-account-design-notes.md` | historical_reference | Auth/profile/account PNG evidence | Referenced by frontend audit |

## Checkout Documents

| File path | Decision | Reason | Replacement / relation |
|---|---|---|---|
| `docs/buyer-checkout-api-bridge.md` | historical_reference | Records address/shipping bridge decisions | `backend-capability-map.md` summarizes current APIs |
| `docs/buyer-checkout-backend-gap.md` | archive | Most listed gaps were subsequently implemented | `backend-capability-map.md` |
| `docs/buyer-checkout-complete-readiness.md` | archive | Readiness was later runtime-confirmed | Runtime report/shipping smoke |
| `docs/buyer-checkout-complete-runtime-report.md` | historical_reference | Concrete complete-cart runtime evidence | Roadmap current summary |
| `docs/buyer-checkout-contact-persistence.md` | keep | Current email persistence/security rationale | Backend capability map relation |
| `docs/buyer-checkout-shipping-smoke.md` | keep | Current shippable checkout evidence and limitations | Roadmap P0 evidence |

## Auth And Order Documents

| File path | Decision | Reason | Replacement / relation |
|---|---|---|---|
| `docs/buyer-auth-architecture.md` | keep | Current session architecture | Backend capability map relation |
| `docs/buyer-auth-api-contract.md` | keep | Current native auth API sequence | Backend capability map relation |
| `docs/buyer-auth-security-gap.md` | keep | Security backlog remains current | Roadmap Phase 6 |
| `docs/buyer-authenticated-orders-api.md` | keep | Current secure list/detail contract | Backend capability map relation |
| `docs/buyer-authenticated-orders-security.md` | keep | Ownership/store isolation rationale | Backend capability map relation |
| `docs/buyer-authenticated-orders-audit.md` | historical_reference | Pre-implementation/runtime audit | Current authenticated orders API |
| `docs/buyer-authenticated-order-runtime-closure.md` | historical_reference | Important runtime root-cause evidence | Current authenticated orders API |
| `docs/buyer-order-history-access-audit.md` | archive | Auth foundation and secure list now implemented | Auth architecture and authenticated orders API |
| `docs/buyer-order-history-api-gap.md` | archive | Selected UI-shell option is obsolete after auth/list implementation | Authenticated orders API |
| `docs/buyer-order-detail-api-gap.md` | archive | Secure detail route has been implemented | Authenticated orders API/backend map |
| `docs/buyer-order-tracking-api-gap.md` | historical_reference | Missing tracking fields remain useful evidence | Backend capability map |

## Cancel, Refund, And Payment Documents

| File path | Decision | Reason | Replacement / relation |
|---|---|---|---|
| `docs/buyer-refund-cancel-gap-audit.md` | historical_reference | Foundational state/provider audit; later sections include Batch 12B update | Roadmap plus focused workflow docs |
| `docs/buyer-unpaid-order-cancellation.md` | keep | Current restricted cancel contract and runtime evidence | Backend capability map relation |
| `docs/buyer-refund-request-workflow.md` | keep | Current pending-request semantics and API | Backend capability map relation |
| `docs/payment-capture-refund-capability-audit.md` | keep | Current provider/capture/refund limitation | Roadmap Phase 8 prerequisite |

## Platform And Supplier Documents

| File path | Decision | Reason | Replacement / relation |
|---|---|---|---|
| `docs/api.md` | keep | Broad platform API reference | Must not replace buyer-specific capability map |
| `docs/schema.md` | keep | Schema reference | No replacement |
| `docs/store-context.md` | keep | Store-resolution authority | All new APIs depend on it |
| `docs/suppliers/*` | keep | Supplier contracts, credentials, dry-run and test evidence | Roadmap supplier pipeline links at high level |
| `docs/testing/*` | keep | Test reports/plans | Evidence, not product planning authority |
| `docs/phase1-dev2-self-test.md` | historical_reference | Early transaction-loop test plan | Current runtime docs supersede planning claims |
| `docs/phase1-dev2-self-test-results.md` | historical_reference | Early runtime evidence | Retain for chronology |
| `docs/phase2a-dev2-handoff.md` | historical_reference | Team handoff snapshot | Current roadmap supersedes scope planning |

## Recommended Cleanup Actions

1. Add a `Historical reference` banner to archive candidates before moving them.
2. Create `docs/archive/buyer-integration/` only in a dedicated documentation-maintenance change.
3. Move archive candidates without changing links until inbound references are checked.
4. Delete `docs/buyer-frontend-current-state 2.md` only after confirming it contains no unique evidence; it is the only current `delete_candidate`.
5. Keep module-specific runtime/security documents near the main docs until their APIs are replaced.

## Current Candidate Counts

- archive candidates: 9
- delete candidates: 1
- documents deleted in this pass: 0
