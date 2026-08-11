# Documentation Index

Use this page as the entry point for current project planning and buyer implementation work. Older gap and batch documents remain historical evidence and must not override the current roadmap.

## Primary Planning

1. [Project Current State And Roadmap](project-current-state-and-roadmap.md) — product status, complete buyer/supplier pipeline, and planning phases.
2. [Buyer Frontend Implementation Plan](buyer-frontend-implementation-plan.md) — route/design/API matrix and the next implementation recommendation.
3. [Buyer Frontend Design System Shell](buyer-frontend-design-system-shell.md) — shared component, token, accessibility, and adoption plan.
4. [Buyer Frontend Next Batches](buyer-frontend-next-batches.md) — FE-01 through FE-09 scopes and quality gates.

## Current Audits And Capability Maps

- [Buyer Frontend Design Progress Audit](buyer-frontend-design-progress-audit.md)
- [Backend Capability Map](backend-capability-map.md)
- [Payment Capture / Refund Capability Audit](payment-capture-refund-capability-audit.md)
- [Document Cleanup Report](document-cleanup-report.md)

## Current Subsystem References

### Authentication And Orders

- [Buyer Auth Architecture](buyer-auth-architecture.md)
- [Buyer Auth API Contract](buyer-auth-api-contract.md)
- [Buyer Auth Security Gap](buyer-auth-security-gap.md)
- [Buyer Authenticated Orders API](buyer-authenticated-orders-api.md)
- [Buyer Authenticated Orders Security](buyer-authenticated-orders-security.md)

### Checkout, Cancellation And Refund Requests

- [Buyer Checkout Contact Persistence](buyer-checkout-contact-persistence.md)
- [Buyer Checkout Shipping Smoke](buyer-checkout-shipping-smoke.md)
- [Buyer Unpaid / Unfulfilled Order Cancellation](buyer-unpaid-order-cancellation.md)
- [Buyer Refund Request Workflow](buyer-refund-request-workflow.md)

### Platform Foundations

- [API Reference](api.md)
- [Schema](schema.md)
- [Store Context](store-context.md)
- [Testing](testing.md)

## Historical Documents

Design notes and earlier gap/batch plans remain useful for chronology and detailed PNG interpretation. Consult [Document Cleanup Report](document-cleanup-report.md) before using or moving them.

The only current `delete_candidate` is `buyer-frontend-current-state 2.md`; it has not been deleted.

## Next Coding Work

The next recommended implementation is **FE-01: Design System Shell + App Layout**. It is intentionally limited to shared primitives and two order-page demonstration integrations. It does not include page-wide rewrites, payment capture, or real refund behavior.

