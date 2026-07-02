# Seller + Buyer Merge Smoke Checklist

Last reviewed: 2026-06-21

Branch: `merge-seller-into-buyer`

Use this checklist after starting the services in [`local-runtime-pipeline-guide.md`](./local-runtime-pipeline-guide.md). Record failures with the route, active database, process/worktree ownership, console/network evidence, and whether fallback data was present. Never record passwords, tokens, cookies, or provider keys.

## Runtime gate

- [ ] Branch is `merge-seller-into-buyer`.
- [ ] PostgreSQL and Redis containers are healthy.
- [ ] Backend responds on `127.0.0.1:9000` and uses the intended local database.
- [ ] AI worker responds on `127.0.0.1:8001` when AI Studio is in scope.
- [ ] Seller dashboard responds on `127.0.0.1:5173`.
- [ ] Buyer storefront responds on `127.0.0.1:5174`.
- [ ] Each port-owning process belongs to this worktree.
- [ ] Seller test account exists in the active local database.
- [ ] No real secrets or credentials are being captured as smoke evidence.

## Buyer smoke checklist

### Catalog and checkout

- [ ] `/store` — settings, categories, and products load from the backend; no mock/static fallback notice appears.
- [ ] `/products/:id` — open a real product ID from `/store`; images, price, description, and availability match backend data.
- [ ] `/cart` — add a real variant, update quantity, remove/re-add an item, and verify totals.
- [ ] `/checkout` — buyer contact, shipping address, and available shipping method states are clear.
- [ ] `/checkout/success` — a real completed-cart response produces an order link and says order placed/authorized, not captured.

### Buyer account

- [ ] `/account` — unauthenticated CTAs and authenticated overview both render correctly.
- [ ] `/account/sign-in` — valid local buyer login returns to account or the requested safe route; invalid credentials show an error.
- [ ] `/account/register` — local registration succeeds or reports a clear validation/API error.
- [ ] `/account/profile` — real email/name/phone fields render; absent fields say `Not provided`.
- [ ] Sign out clears buyer state while keeping the cart and seller-dashboard login state.
- [ ] Switch account returns to buyer sign-in without clearing the cart.

### Orders

- [ ] `/account/orders` — authenticated list shows real display IDs, statuses, totals, thumbnails, and links.
- [ ] `/account/orders/:id` — authenticated detail shows items, totals, address, payment, fulfillment, and only eligible actions.
- [ ] `/account/orders/:id/tracking` — real tracking renders when present; otherwise an unavailable/empty state appears without fabricated events.
- [ ] `/orders/lookup` — guest lookup works with a real display ID and checkout email.
- [ ] Guest order detail does not expose authenticated cancellation/refund actions.
- [ ] Authorized-not-captured wording is used; refund request wording remains `Pending review`.

### Static support pages

- [ ] `/help` — ordering, checkout, authorization, cancellation, refund request, guest lookup, and support placeholders render.
- [ ] `/terms` — internal-demo draft notice appears and no collected/refunded-money claim is made.
- [ ] `/privacy` — account, cart, order, guest lookup, and buyer/seller data separation sections render.
- [ ] Static pages provide links to `/store`, `/account`, and `/account/orders`.

## Seller smoke checklist

- [ ] `/login` — sign in with an admin account that exists in the active local DB; a `401` is investigated as an account/DB issue first.
- [ ] `/products` — real products load from backend and list actions are visible.
- [ ] `/products/:id/edit` — edit a real product/draft and verify existing metadata/images without publishing unintended changes.
- [ ] `/orders` — real orders load from the active DB with expected operational statuses.
- [ ] `/settings` — current store settings load; do not upload production branding during a smoke run.
- [ ] `/ai-studio/create` — form loads and can start only the intended local mock/test job.
- [ ] `/ai-studio/progress/:jobId` — a real local job ID shows running/completed/failed state without cross-worktree data.
- [ ] `/ai-studio/complete/:productId` — generated product data and image URLs resolve from the active worker.

## AI asset checks

- [ ] AI worker `/health` reports the expected mock/provider mode.
- [ ] Port `8001` belongs to the current worktree.
- [ ] New generated files appear under `apps/ai-worker/var/uploads`.
- [ ] Generated URLs return `200` from the active worker.
- [ ] Historical image failures are classified as DB/upload mismatch rather than patched with fake files.
- [ ] Generated uploads remain untracked by Git.
- [ ] No expectation is made that a colleague's AI images arrive through Git.

## Payment boundary checks

- [ ] Stripe real payment is not implemented yet.
- [ ] Current payment mode is system-default authorize-only.
- [ ] Checkout success does not claim captured payment or collected money.
- [ ] Refund requests are shown as pending review, not completed refunds.
- [ ] Cancellation appears only when backend eligibility allows it before capture/fulfillment.

Next payment batch: **PAY-01 Stripe integration audit plan**.

## Repository verification

Required after code changes:

```bash
npm --workspace apps/storefront run typecheck
npm --workspace apps/storefront run build
npm --workspace apps/storefront run test -- --runInBand
npm --workspace apps/seller-dashboard run build
git diff --check
```

For this documentation-only FE-09 batch:

```bash
git diff --check
```

## Handoff result

- [ ] Buyer route smoke: pass / fail with evidence.
- [ ] Seller route smoke: pass / fail with evidence.
- [ ] AI worker and generated assets: pass / fail / not in scope.
- [ ] Buyer fallback behavior: absent during real-data pass, or explicitly documented.
- [ ] Payment wording: pass / fail.
- [ ] Secrets scan/manual review: no secrets written.
- [ ] Known blockers are recorded with owner and next action.
