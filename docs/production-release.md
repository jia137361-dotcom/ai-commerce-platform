# Production release checklist (CitiGoo)

## Non-negotiable rules

1. Production hotfixes must be committed and pushed to GitHub **before** the next deploy.
2. Every PR must pass:
   - backend TypeScript / Medusa start smoke
   - seller-dashboard production build
   - storefront production build
   - database migration check
   - product list / edit / publish / checkout smoke
3. Database field changes must ship with a migration in the same PR.
4. Deploy scripts must **never**:
   - run `docker compose down`
   - run `git stash --include-untracked`
   - swallow migration failures (`|| true`, catch-and-continue)
5. Deploy order: backup → preflight → build images → migrate (fail hard) → recreate services one-by-one → health checks.

## Scripts in this repo

| Script | Purpose |
| --- | --- |
| `scripts/prod/preflight.sh` | Validate compose + `.env`, optional health probes |
| `scripts/prod/backup-postgres.sh` | `pg_dump` gzip into `.prod-backups/` |
| `scripts/prod/deploy.sh` | Safe rolling deploy |
| `scripts/prod/rollback.sh` | Recreate services from `:previous` images |

Compose template: `infra/docker-compose.prod.yml`

## Example deploy

```bash
export PROD_ENV_FILE=apps/medusa-backend/.env
export HEALTHCHECK_URLS="http://127.0.0.1:9000/health http://127.0.0.1:5173/login http://127.0.0.1:3000/"
./scripts/prod/deploy.sh
```

Optional overrides:

```bash
SERVICES="medusa seller-dashboard storefront"
ALLOW_DIRTY_DEPLOY=0   # keep 0 in production
SKIP_BACKUP=0
SKIP_MIGRATE=0
```

## Rollback

```bash
export HEALTHCHECK_URLS="http://127.0.0.1:9000/health http://127.0.0.1:5173/login http://127.0.0.1:3000/"
./scripts/prod/rollback.sh
```

If a migration must be undone, restore `.prod-backups/latest.sql.gz` explicitly. Image rollback does **not** reverse schema.

## Seller / storefront API base URL

- Seller dashboard: only `VITE_MEDUSA_URL`
- Buyer storefront: only `VITE_MEDUSA_BASE_URL`

Do not use `VITE_API_URL`. Production Docker/compose must pass the matching variable at image build time.

## Before merging large branches

Confirm these seller routes still exist and are linked:

- Products list `/products`
- Product edit `/products/:id/edit`
- Categories `/categories`
- Publish button on product edit
- Store preview / View store link
