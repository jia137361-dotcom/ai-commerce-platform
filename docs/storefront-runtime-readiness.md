# Storefront Runtime Readiness

Date: 2026-06-15

Branch: `feature/buyer-frontend-integration`

Scope: runtime readiness only. No UI rebuild and no backend business logic changes were made.

## Summary

`apps/storefront` is runnable as a Vite React app in the current monorepo.

Readiness result:

- Root workspace includes `apps/storefront` through `apps/*`.
- Storefront package scripts exist: `dev`, `typecheck`, `build`.
- Storefront env example includes Vite variables and compatible `NEXT_PUBLIC_*` variables.
- API requests from `src/lib/store-api.ts` include `x-publishable-api-key` and `X-Store-Id`.
- Typecheck passed.
- Build passed.

## Workspace Check

Root `package.json` includes:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

Because `apps/storefront/package.json` exists, npm can run it as workspace `apps/storefront` or package name `@ai-commerce/storefront`.

## Storefront Scripts

`apps/storefront/package.json` includes:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5174",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b",
    "preview": "vite preview --host 127.0.0.1 --port 4174"
  }
}
```

Status:

- `dev`: present.
- `typecheck`: present and passed.
- `build`: present and passed.

## Environment Files

`apps/storefront/.env.example` includes:

```text
VITE_MEDUSA_BASE_URL=http://127.0.0.1:9000
VITE_PUBLISHABLE_API_KEY=pk_replace_me
VITE_DEFAULT_STORE_ID=default_store

NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://127.0.0.1:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_replace_me
NEXT_PUBLIC_STORE_ID=default_store
```

No real `apps/storefront/.env.local` was present during this check.

Created `apps/storefront/.env.local.example` with placeholder values only:

```text
VITE_MEDUSA_BASE_URL=http://127.0.0.1:9000
VITE_PUBLISHABLE_API_KEY=pk_replace_me
VITE_DEFAULT_STORE_ID=default_store

NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://127.0.0.1:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_replace_me
NEXT_PUBLIC_STORE_ID=default_store
```

`.gitignore` was updated with a narrow exception so this example file is trackable while real `.env.local` remains ignored.

## API Header Check

Current API client file:

- `apps/storefront/src/lib/store-api.ts`

It resolves env values from:

- `VITE_MEDUSA_BASE_URL`
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`
- `VITE_PUBLISHABLE_API_KEY`
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `VITE_DEFAULT_STORE_ID`
- `NEXT_PUBLIC_STORE_ID`

Requests include:

```ts
{
  "x-publishable-api-key": storefrontConfig.publishableKey,
  "X-Store-Id": storefrontConfig.storeId || "default_store"
}
```

`Content-Type: application/json` is added when a request body exists.

No separate `buyer-api.ts` exists yet; current runtime uses `store-api.ts`.

## Checks Run

### Typecheck

Command:

```bash
npm --workspace apps/storefront run typecheck
```

Result: passed.

### Build

Command:

```bash
npm --workspace apps/storefront run build
```

Result: passed.

Build output summary:

```text
vite v5.4.21 building for production...
48 modules transformed.
dist/index.html
dist/assets/index-*.css
dist/assets/index-*.js
built in 2.54s
```

The generated `dist/` output is ignored by `.gitignore`.

## How To Start Backend

From repo root:

```bash
npm --workspace apps/medusa-backend run dev
```

If running local database/Redis, start the infra first according to the backend setup, then run migrations/seed as needed:

```bash
npm --workspace apps/medusa-backend run db:migrate
npm --workspace apps/medusa-backend run seed
```

Backend local URL:

```text
http://127.0.0.1:9000
```

Storefront dev origin should be allowed in backend `STORE_CORS`, for example:

```text
STORE_CORS=http://127.0.0.1:5174,http://localhost:5174,http://localhost:3000
```

## How To Start Storefront

Create a local env file from the example and replace the publishable key:

```bash
cp apps/storefront/.env.local.example apps/storefront/.env.local
```

Then edit:

```text
VITE_PUBLISHABLE_API_KEY=<real_publishable_api_key>
```

Start dev server:

```bash
npm --workspace apps/storefront run dev
```

Browser URL:

```text
http://127.0.0.1:5174/store
```

Other current routes:

- `http://127.0.0.1:5174/products/:product_id`
- `http://127.0.0.1:5174/cart`
- `http://127.0.0.1:5174/checkout`
- `http://127.0.0.1:5174/account/orders`

## Files Modified

- `.gitignore`
  - Added `!apps/storefront/.env.local.example` so placeholder local env docs are trackable.

- `apps/storefront/.env.local.example`
  - Added placeholder local env example. No real keys.

- `docs/storefront-runtime-readiness.md`
  - Added this readiness report.

## Notes

- No backend business logic was changed.
- No UI rebuild was performed.
- TypeScript generated `apps/storefront/tsconfig.tsbuildinfo` during checks; it was removed as a local build artifact.
