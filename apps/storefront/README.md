# CitiGoo Storefront Prototype

Single-store user-facing storefront for the Phase 1 Medusa backend.

## Environment

```bash
cp apps/storefront/.env.example apps/storefront/.env
```

Set:

- `NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000`
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<your publishable API key>`
- `NEXT_PUBLIC_STORE_ID=default_store`

## Local Pipeline

1. Start Docker services if your backend `.env` points at local Postgres/Redis:

```bash
docker compose -f infra/docker-compose.yml up -d
```

2. Install workspace dependencies:

```bash
npm install
```

3. Migrate and seed the Medusa backend:

```bash
npm --workspace apps/medusa-backend run db:migrate
npm --workspace apps/medusa-backend run seed
```

4. Create or configure a publishable API key:

- Use the Medusa admin/API key workflow for the local backend.
- Put the key in `apps/storefront/.env` as `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
- Keep `NEXT_PUBLIC_STORE_ID=default_store` unless testing another Phase 1 store.

5. Run the backend:

```bash
npm --workspace apps/medusa-backend run dev
```

6. Run the storefront:

```bash
npm --workspace apps/storefront run dev
```

7. Test the product API:

```bash
curl -i http://localhost:9000/store/products \
  -H "x-publishable-api-key: $NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" \
  -H "X-Store-Id: ${NEXT_PUBLIC_STORE_ID:-default_store}"
```

8. Open the frontend:

- Store home: `http://127.0.0.1:5174/store`
- Category view: `http://127.0.0.1:5174/store?tab=category`
- Reviews view: `http://127.0.0.1:5174/store?tab=reviews`
- Account orders: `http://127.0.0.1:5174/account/orders`
- Order details: `http://127.0.0.1:5174/account/orders/CG-20260602-1008`

The storefront fetches `/store/products` from Medusa when available. If the backend is offline, the key is missing, or no products are returned, it uses typed mock products so the user flow remains browsable.
