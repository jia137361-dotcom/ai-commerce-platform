# Local Runtime Pipeline Guide

Last reviewed: 2026-06-21

Branch: `merge-seller-into-buyer`

This guide starts the merged buyer + seller prototype on one machine. It does not import databases, configure real AI keys, or enable Stripe.

## Prerequisites

- Node.js 20 or newer and repository dependencies installed.
- Docker with Compose support.
- A Python environment with AI worker requirements installed when AI Studio is in scope.
- Local environment files created from tracked examples, with secrets kept outside Git.
- A storefront publishable API key and a local admin account that belong to the database being used.

Do not commit `.env`, `.env.local`, tokens, passwords, provider keys, database dumps, or generated uploads.

## Start services

Run each long-lived process in a separate terminal from the repository root unless noted otherwise.

### 1. PostgreSQL and Redis

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

Optional status check:

```bash
docker compose -f infra/docker-compose.yml ps
```

### 2. Medusa backend

```bash
DATABASE_URL="postgres://medusa:medusa@127.0.0.1:5432/ai_commerce" \
npm --workspace apps/medusa-backend run dev
```

Expected URL: `http://127.0.0.1:9000`.

The command overrides only the local database URL for that process. Other required configuration still comes from the backend environment. Do not paste secret values into documentation or commits.

### 3. AI worker

```bash
cd apps/ai-worker
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

The repository's older AI worker setup may use a virtual environment named `citigooapi` instead of `.venv`. Use the interpreter containing the installed requirements, but keep the worker bound to `127.0.0.1:8001` for this smoke run.

Health check:

```bash
curl -sS http://127.0.0.1:8001/health
```

For local work without a real provider key, use the repository's mock-worker configuration. This guide does not configure or validate a real AI provider.

### 4. Buyer storefront

```bash
npm --workspace apps/storefront run dev
```

Expected URL: `http://127.0.0.1:5174/store`.

### 5. Seller dashboard

```bash
npm --workspace apps/seller-dashboard run dev
```

Expected URL: `http://127.0.0.1:5173/login`.

## Port ownership

| Port | Expected process |
|---|---|
| `9000` | Medusa backend from this worktree |
| `8001` | AI worker from this worktree |
| `5173` | Seller dashboard Vite server |
| `5174` | Buyer storefront Vite server |

Before diagnosing missing images or stale frontend code, inspect listeners:

```bash
lsof -nP -iTCP:9000 -sTCP:LISTEN
lsof -nP -iTCP:8001 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:5174 -sTCP:LISTEN
```

Verify that each command points to this checkout/worktree. Stop an unintended process before starting the expected one; do not assume the first service answering on a port belongs to the current branch.

## Seller account ownership

Seller authentication is backed by the active local Medusa database. Git merges source code, not database users.

- A seller account created on a colleague's computer will not exist in this database automatically.
- A `401` from `/login` does not by itself indicate a seller-dashboard frontend bug.
- Create an admin user locally through the approved Medusa setup flow, or obtain explicit approval before importing the colleague's matching database snapshot.
- Do not record passwords, bearer tokens, session cookies, or real email/password pairs in Git, screenshots, or smoke reports.

When switching databases, restart the backend and sign in again so the browser session matches the new database.

## AI files, URLs, and database alignment

The AI worker resolves the relative default upload directory to:

```text
apps/ai-worker/var/uploads
```

It serves those files at URLs shaped like:

```text
http://localhost:8001/static/<filename>
```

The database stores these URLs or filenames as product/generation metadata. Git ignores `apps/ai-worker/var/uploads`, so source control cannot reconstruct generated assets.

For an AI-generated product to render correctly, all three must agree:

1. The database row references the expected generated filename.
2. That file exists in the active worker's uploads directory.
3. Port `8001` is served by that same worker/worktree.

Quick diagnosis for a broken image:

```bash
curl -I "http://127.0.0.1:8001/static/<filename>"
```

- `200`: the active worker has the file; inspect browser CORS/content and the stored URL next.
- `404`: the database and uploads directory do not match, or the wrong worktree owns port `8001`.
- Connection refused: no worker owns `8001`.

Do not copy a database without its matching uploads when the smoke scope includes historical AI images. Do not add generated uploads to Git as a workaround.

## Buyer real-data versus fallback check

The storefront intentionally has static/mock fallback behavior for selected settings, category, product, detail, review, and share requests. This improves demo resilience but can conceal runtime faults.

For a real-data smoke pass:

1. Open browser developer tools before loading `/store`.
2. Confirm requests target `http://127.0.0.1:9000` and include the expected store/publishable-key headers.
3. Treat non-2xx catalog responses as failures even if products remain visible.
4. Check for visible `Mock data fallback` or `Static UI fallback` notices.
5. Check the console for `[buyer-api] ... fallback` warnings.
6. Confirm displayed IDs/content exist in the active database rather than only in `apps/storefront/src/lib/mock-data.ts`.

Fallback content is acceptable only when explicitly testing fallback UX. It is not evidence that the merged runtime pipeline is healthy.

## Payment state during smoke

Stripe real payment is not implemented yet. Current payment mode is system-default authorize-only.

Expected behavior:

- Checkout can create an authorized-not-captured order.
- Success means the order was placed; it does not prove capture.
- Cancellation can appear only when backend eligibility allows it before capture/fulfillment.
- Refund requests, where eligible, represent pending review and not completed money movement.

Next payment batch: **PAY-01 Stripe integration audit plan**.

## Common failure map

| Symptom | Likely cause | Check |
|---|---|---|
| Seller login returns `401` | Account absent from active local DB | Confirm backend DB and create an approved local admin account |
| AI image returns `404` | DB/upload mismatch or wrong worker on `8001` | Check listener, stored URL, and `apps/ai-worker/var/uploads` |
| AI job behaves differently than expected | Worker from another worktree or different mock/provider config | Check process command/path and `/health` response |
| Buyer shows products while backend calls fail | Storefront fallback data | Inspect fallback banner, console, and network requests |
| Buyer/seller shows stale data | Wrong backend/DB or stale browser session | Confirm `9000` owner, DB URL, then sign in again |
| Checkout appears paid | Incorrect interpretation of authorization | Inspect payment evidence; current mode does not capture |

## Static verification commands

```bash
npm --workspace apps/storefront run typecheck
npm --workspace apps/storefront run build
npm --workspace apps/storefront run test -- --runInBand
npm --workspace apps/seller-dashboard run build
git diff --check
```

For documentation-only edits, `git diff --check` is sufficient. Run the full command set after any code change.
