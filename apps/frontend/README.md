# CitiGoo Frontend Demo

Demo storefront and seller/admin console for the current Medusa backend.

## Run

```bash
cp apps/frontend/.env.example apps/frontend/.env
npm --workspace apps/frontend run dev
```

Do not commit real `.env` values.

## Required Environment

- `VITE_MEDUSA_BASE_URL` points to the Medusa backend, usually `http://127.0.0.1:9000`.
- `VITE_AI_WORKER_BASE_URL` points to the AI Worker, usually `http://127.0.0.1:8001`.
- `VITE_DEFAULT_STORE_ID` defaults to `default_store`.
- `VITE_TEST_STORE_ID` defaults to `test_store`.
- `VITE_PUBLISHABLE_API_KEY` is required for Store API requests.

## Backend Alignment

Real APIs are used for product lists/details, categories, cart create/read/add/complete, order lookup/tracking, admin login, AI generate-and-draft, product publish, supplier products, store settings, admin orders, fulfillment, and supplier order actions.

Demo-only or disabled surfaces are clearly labeled where the backend does not currently provide buyer auth, separate seller roles, full shipping calculation, Stripe payment UI, or full product edit persistence.
