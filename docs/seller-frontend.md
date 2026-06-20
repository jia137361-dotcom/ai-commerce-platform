# Seller Dashboard

Vite + React seller SPA at `http://localhost:5173`.

## Prerequisites

- Medusa backend running on `:9000`
- AI Worker on `:8001` with `AI_WORKER_MOCK_GENERATION=true` for local AI tests
- Admin user + `ADMIN_TOKEN` from `POST /auth/user/emailpass`

## Setup

```bash
cp apps/seller-dashboard/.env.example apps/seller-dashboard/.env
npm install
npm run db:migrate --workspace apps/medusa-backend
npm run dev:all
```

## Environment

| Variable | Default |
|----------|---------|
| `VITE_MEDUSA_URL` | `http://localhost:9000` |
| `VITE_STORE_ID` | `default_store` |

## Routes

| Path | Page |
|------|------|
| `/login` | Email/password login |
| `/products` | Product list |
| `/products/:id/edit` | Edit / publish / duplicate |
| `/orders` | Order list |
| `/orders/:orderId/fulfillment` | Fulfillment timeline + actions |
| `/ai-studio/create` | Start AI generation |
| `/ai-studio/progress/:jobId` | Job progress (running / queued / failed + retry) |
| `/ai-studio/complete/:productId` | Generation complete — design, mockup, color palette |
| `/settings` | Store settings (logo upload, brand, locale) |

## AI image generation config

All AI keys live in **`apps/medusa-backend/.env`** (ai-worker reads the same file):

```bash
AI_WORKER_MOCK_GENERATION=false
IMAGE_GEN_PROVIDER=fal          # or openai
FAL_KEY=your-fal-key
FAL_MODEL=fal-ai/flux-2-pro
DEEPSEEK_API_KEY=your-deepseek-key
AI_WORKER_BASE_URL=http://localhost:8001
```

Start **three** processes for full AI Studio:

1. `npm run dev` (Medusa `:9000`)
2. `cd apps/ai-worker && uvicorn app.main:app --port 8001`
3. `npm run dev:seller` (`:5173`)

## Scripts

- `npm run dev:seller` — seller dashboard only
- `npm run dev:all` — Medusa + seller dashboard
- `npm run test:seller` — Vitest unit tests
- `npm run test:e2e:seller` — Playwright E2E (set `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- `scripts/seller-admin-smoke.sh` — backend API smoke (requires `ADMIN_TOKEN`)

## Definition of Done (local)

- [ ] `npm run dev:all` — Medusa `:9000` + seller `:5173` start without errors
- [ ] Login via `/login` with Medusa admin credentials
- [ ] AI Studio: `POST /admin/ai/generate` → progress → complete page → edit draft
- [ ] Products: table list, search, edit/publish/duplicate/archive with action menu
- [ ] Orders: expandable rows, fulfillment timeline page, push-fulfillment / mock-shipment
- [ ] Settings: upload logo (PNG/JPG ≤2MB), save brand, currency/language; errors shown inline + toast
- [ ] Real AI (optional): `AI_WORKER_MOCK_GENERATION=false` + `FAL_KEY` or `OPENAI_API_KEY` → design images from provider
- [ ] Notifications bell shows unread count after AI job completes
- [ ] `npm test` — backend Jest green
- [ ] `npm run test:seller` — Vitest green
- [ ] `ADMIN_TOKEN=... ./scripts/seller-admin-smoke.sh` — API smoke green (backend running)
- [ ] Publish product → `GET /store/products` returns it (buyer API, no storefront UI needed)

## E2E (optional)

Requires seller dev server + credentials:

```bash
E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=secret npm run test:e2e:seller
```
