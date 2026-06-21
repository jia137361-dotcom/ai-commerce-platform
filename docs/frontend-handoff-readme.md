# Merged Buyer + Seller Frontend Handoff

Last reviewed: 2026-06-21

Branch: `merge-seller-into-buyer`

## Current status

- Buyer frontend: FE-01 through FE-08 completed.
- Seller integration: merged into the current branch.
- Payment: `pp_system_default`, authorization only. Checkout does not capture funds.
- Stripe: not implemented.
- AI worker: depends on the local worker and its mock/provider configuration.
- This repository is a local integrated prototype, not a production commerce deployment.

The main buyer routes now cover store browsing, product detail, cart, checkout, checkout success, buyer auth/profile, authenticated and guest orders, tracking, help, terms, and privacy. The seller dashboard covers login, products, orders, settings, and AI Studio screens.

## Start here

Use these documents together:

1. [`local-runtime-pipeline-guide.md`](./local-runtime-pipeline-guide.md) — process startup, ports, account ownership, AI uploads, DB alignment, and troubleshooting.
2. [`seller-buyer-merge-smoke-checklist.md`](./seller-buyer-merge-smoke-checklist.md) — route-by-route buyer and seller acceptance checklist.
3. [`project-current-state-and-roadmap.md`](./project-current-state-and-roadmap.md) — broader product state and remaining gaps.
4. [`backend-capability-map.md`](./backend-capability-map.md) — current API and runtime capability authority.
5. [`payment-capture-refund-capability-audit.md`](./payment-capture-refund-capability-audit.md) — payment wording and eligibility boundary.

## Local process map

| Service | URL | Purpose |
|---|---|---|
| Medusa backend | `http://127.0.0.1:9000` | Buyer/store APIs and seller/admin APIs |
| AI worker | `http://127.0.0.1:8001` | Local mock or configured AI generation and static generated files |
| Seller dashboard | `http://127.0.0.1:5173` | Seller/admin frontend |
| Buyer storefront | `http://127.0.0.1:5174` | Buyer frontend |

Recommended startup order:

1. PostgreSQL and Redis.
2. Medusa backend.
3. AI worker when testing AI Studio or generated images.
4. Buyer storefront and seller dashboard.
5. Run health checks, then the smoke checklist.

## Important machine-local boundaries

### Accounts and database

A local database does not automatically contain seller accounts created on a colleague's computer. A seller login returning `401` usually means the account is absent from the database currently used by the local backend, or the credentials do not match that database.

Create an admin user in the local Medusa environment using the team's approved local setup process, or—only with explicit approval—import the colleague's matching database snapshot. Database import is not part of this FE-09 batch. Never add account passwords, auth tokens, database dumps, or real secrets to Git.

### AI-generated images

AI-generated images are machine-local files exposed through localhost URLs. The default worker stores them under `apps/ai-worker/var/uploads` and serves them from `http://localhost:8001/static/...`.

- `var/uploads` is ignored by Git, so generated files do not travel with a branch or merge.
- A colleague's generated images do not automatically appear on this machine.
- Database image URLs and the corresponding uploads directory must come from the same runtime state.
- If port `8001` is served by a worker from another worktree, database URLs may point at filenames that worker does not have, producing `404` images.

### Buyer fallback data

The buyer API client can show marked static/mock fallback data when selected catalog APIs fail. A rendered store or product page alone does not prove the backend and database are correct. Treat visible fallback notices, console warnings, unexpected mock product IDs, or failed network requests as a failed real-data smoke check.

## Payment boundary

Stripe real payment is not implemented yet. Current payment mode is system-default authorize-only.

- An order placed locally may have payment authorization without capture.
- Do not describe authorization as money collected.
- A refund request means pending review, not provider-confirmed return of money.
- Cancellation may be available before capture and fulfillment when backend eligibility allows it.

Next payment batch: **PAY-01 Stripe integration audit plan**.

## Handoff completion criteria

- All four expected ports are owned by processes from this worktree.
- Backend and AI worker health checks pass when those services are in scope.
- Buyer catalog pages show backend data without fallback notices.
- Seller login uses an account present in the active local database.
- Any AI image URLs resolve from the active worker's uploads directory.
- Buyer and seller route checklists are completed with failures recorded, not hidden by mock data.
- No `.env.local`, credentials, tokens, database dumps, or generated uploads are included in the handoff commit.
