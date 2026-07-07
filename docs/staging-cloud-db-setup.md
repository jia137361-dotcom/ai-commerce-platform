# Staging Cloud Database and Account Separation

This project runs as one shared marketplace backend:

- One Medusa backend.
- One PostgreSQL database per environment.
- Storefront uses only public Store API access with a publishable API key.
- Seller dashboard uses Medusa `user` auth plus `store_member` and `mc_store`.
- Platform Ops uses Medusa `user` auth plus an active `platform_operator`.
- Buyer accounts are Medusa `customer` records and should remain separate from seller/operator users.

## Account Model

### Buyer

Buyer identity is stored as Medusa customer data. Storefront authentication should not grant seller or operator permissions. Buyer preferences, such as country/region or display currency, live in customer metadata and are not authorization.

### Seller

Seller identity is a Medusa `user` linked to:

- `store_member.user_id`
- `store_member.store_id`
- `mc_store.id`
- `store_setting.store_id`

Seller APIs must validate the authenticated user and `X-Store-Id` through store membership. A seller must not be able to manage another store by changing `X-Store-Id`.

### Platform Operator

Platform Ops identity is a Medusa `user` linked to an active `platform_operator` row. `requirePlatformOperator` rejects users that also have `store_member` rows, so operator accounts must be separate from seller accounts.

Roles:

- `admin`: can manage platform-level data and operator access.
- `viewer`: can log in but should not mutate operator access.

### Root Admin

The root admin is a permanent Medusa user used for staging/system bootstrap. It should not be used as a seller or buyer account. In staging, bootstrap it as an active admin platform operator so it can create or disable additional operator access.

Bootstrap:

```bash
ROOT_ADMIN_EMAIL=admin@example.com \
ROOT_ADMIN_PASSWORD='<set-locally-never-commit>' \
npm --workspace apps/medusa-backend run root:admin:bootstrap
```

The script is idempotent and refuses to proceed if the root admin email is already linked to `store_member`.

## Cloud Database Strategy

Prefer a fresh cloud database for staging.

Fresh database flow:

1. Create a new Neon PostgreSQL database or branch.
2. Set `DATABASE_URL` only in local shell, deployment secrets, or an ignored env file.
3. Run migrations.
4. Run logistics/supplier bootstrap scripts as needed.
5. Bootstrap root admin/operator.
6. Register fresh seller and buyer test accounts.

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST/DB?sslmode=require'
npm --workspace apps/medusa-backend run db:migrate
npm --workspace apps/medusa-backend run regions:bootstrap
ROOT_ADMIN_EMAIL=admin@example.com ROOT_ADMIN_PASSWORD='<secret>' npm --workspace apps/medusa-backend run root:admin:bootstrap
```

Clone local DB only when you intentionally need local test products/orders in staging. Before cloning, audit for:

- real secrets or tokens in data
- seller/operator user overlap
- throwaway test orders
- generated local asset URLs such as `127.0.0.1`

Do not restore over a non-empty cloud database without an explicit backup and approval.

## Local Startup

Install root dependencies with Node 20:

```bash
npm install
```

Prepare the AI worker virtualenv once:

```bash
python3 -m venv apps/ai-worker/citigooapi
apps/ai-worker/citigooapi/bin/pip install -r apps/ai-worker/requirements.txt
```

Start everything:

```bash
npm run dev:all
```

`npm run dev:all` starts:

- Medusa backend: `http://127.0.0.1:9000`
- Seller dashboard: `http://127.0.0.1:5173`
- Storefront: `http://127.0.0.1:5174`
- Platform Ops: `http://127.0.0.1:5175`
- AI worker: `http://127.0.0.1:8001`

`npm run dev:full` is kept as an alias for `npm run dev:all`.

Use local DB:

```bash
export DATABASE_URL='postgres://medusa:medusa@localhost:5433/ai_commerce'
npm run dev:all
```

Use cloud DB locally:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST/DB?sslmode=require'
npm run dev:all
```

Never commit real `.env`, dump, upload, or generated asset files.

## Platform Ops Operator Management

After logging in as an admin platform operator, open Platform Ops and choose `Operators`.

The page can:

- list platform operators
- add an existing Medusa user as an operator
- set role to `admin` or `viewer`
- deactivate/reactivate operator access

It will not accept a user already linked to a seller store.

If a Medusa user does not exist yet, create it through the root bootstrap script or Medusa admin/CLI first, then add it as an operator.

## Smoke Checklist

1. Root/admin/operator can log into Platform Ops.
2. Seller account cannot log into Platform Ops.
3. Seller account can log into Seller Dashboard and receives its own `store_id`.
4. Storefront can browse public products without any operator token.
5. AI worker responds on port 8001 and backend AI job creation does not use `python -m http.server`.
6. Seller publishes a product and buyer can see it.
7. Buyer checkout still validates product sales regions against the actual shipping address.
