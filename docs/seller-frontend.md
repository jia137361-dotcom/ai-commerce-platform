# Seller Dashboard

Vite + React seller SPA at `http://127.0.0.1:5173` (also works via `http://localhost:5173`).

## Prerequisites

- Postgres + Redis (e.g. `docker compose -f infra/docker-compose.yml up -d`)
- `npm run dev:all` starts Medusa `:9000`, seller `:5173`, storefront, AI worker `:8001`
- Admin user for seller login (`POST /auth/user/emailpass`)
- Real AI: keep `AI_WORKER_MOCK_GENERATION=false` in `apps/medusa-backend/.env` and provide DashScope/FAL keys

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

1. `npm run dev:all` — Medusa `:9000` + seller `:5173` + storefront + AI worker `:8001`

## Scripts

- `npm run dev:seller` — seller dashboard only
- `npm run dev:all` — Medusa + seller + buyer storefront + AI worker
- `npm run test:seller` — Vitest unit tests
- `npm run test:e2e:seller` — Playwright E2E (set `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- `scripts/seller-admin-smoke.sh` — backend API smoke (requires `ADMIN_TOKEN`)

## Definition of Done (local)

- [ ] `npm run dev:all` — Medusa `:9000` + seller `:5173` + storefront + AI `:8001` start without errors
- [ ] Login via `/login` lands on Overview
- [ ] Orders: expandable rows, fulfillment timeline page, push-fulfillment / mock-shipment
- [ ] Inbox / Reviews / Settings reachable from top nav
- [ ] Settings: upload logo (PNG/JPG ≤2MB), save brand, currency/language; errors shown inline + toast
- [ ] Real AI (optional): `AI_WORKER_MOCK_GENERATION=false` + DashScope/FAL key → design images from provider
- [ ] Notifications bell shows unread count / open-to-do links
- [ ] `npm test` — backend Jest green
- [ ] `npm run test:seller` — Vitest green
- [ ] `ADMIN_TOKEN=... ./scripts/seller-admin-smoke.sh` — API smoke green (backend running)
- [ ] Publish product → `GET /store/products` returns it (buyer API, no storefront UI needed)

## E2E (optional)

Requires seller dev server + credentials:

```bash
E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=secret npm run test:e2e:seller
```
