# Dev3 Full Backend Validation Pipeline

This runbook is the reproducible backend validation path for store isolation, product-to-cart bridge, AI generation, product rating/review, and optional S2BDIY sandbox supplier checks.

## 1. Environment Preparation

Use the isolated supplier worktree when validating supplier-related changes:

```bash
cd /Users/Zhuanz/Documents/Codex/ai-commerce-platform-supplier-test
git branch --show-current
```

Expected branch:

```text
feature/supplier-s2bdiy-dry-run
```

Load Node through nvm:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
node -v
npm -v
```

Do not commit:

- `.env` files
- local pipeline env files
- logs
- supplier secrets
- `ADMIN_TOKEN`
- `PUBLISHABLE_API_KEY`
- S2BDIY tokens or app secrets

## 2. Start Backend Dependencies and Bootstrap Data

Start Docker services:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

Run Medusa database setup:

```bash
npm --workspace apps/medusa-backend run db:migrate
npm --workspace apps/medusa-backend run seed
```

Run the Phase 1 bootstrap with Medusa exec from the backend package:

```bash
cd apps/medusa-backend
npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts
cd -
```

Do not use `npm --workspace apps/medusa-backend exec ./src/scripts/...`; npm treats that form as a package command, not the Medusa exec entrypoint.

Start the backend:

```bash
npm --workspace apps/medusa-backend run dev
```

Expected base URL:

```text
http://127.0.0.1:9000
```

## 3. Get `ADMIN_TOKEN`

Use the Medusa v2 auth endpoint:

```bash
MEDUSA_BASE_URL="${MEDUSA_BASE_URL:-http://127.0.0.1:9000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-super-secret-password}"

ADMIN_TOKEN="$(
  curl -sS -X POST "$MEDUSA_BASE_URL/auth/user/emailpass" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r '.token // empty'
)"
```

Validate:

```bash
curl -sS -i "$MEDUSA_BASE_URL/admin/users/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected: HTTP `200`.

Do not use old `/admin/auth` as the default. In the current Medusa v2 backend it may return an empty token.

## 4. Get `PUBLISHABLE_API_KEY`

Preferred path: Admin API `/admin/api-keys`.

List keys:

```bash
curl -sS "$MEDUSA_BASE_URL/admin/api-keys" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
| jq .
```

If no publishable key exists, create one with the project-approved Admin API route and copy the returned `pk_...` token.

If `/admin/publishable-api-keys` returns HTML or `404`, that endpoint is not applicable to this Medusa v2 project.

If Admin API does not return token text, inspect the local development database:

```bash
docker exec ai-commerce-postgres psql -U medusa -d ai_commerce \
  -c "select id, token, type, title, revoked_at from api_key where type = 'publishable';"
```

Validate storefront access:

```bash
curl -sS -i "$MEDUSA_BASE_URL/store/products" \
  -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" \
  -H "X-Store-Id: default_store"
```

Expected: HTTP `200`.

## 5. Start AI Worker Mock

Run AI Worker in mock generation mode:

```bash
cd apps/ai-worker
AI_WORKER_MOCK_GENERATION=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Validate:

```bash
AI_WORKER_BASE_URL="${AI_WORKER_BASE_URL:-http://127.0.0.1:8001}"
curl -sS "$AI_WORKER_BASE_URL/health"
```

## 6. Create Dev3 Local Env

Copy the example file:

```bash
cp scripts/dev3-full-backend-pipeline.example.env scripts/dev3-full-backend-pipeline.local.env
```

Minimum local values:

```bash
MEDUSA_BASE_URL=http://127.0.0.1:9000
AI_WORKER_BASE_URL=http://127.0.0.1:8001
ADMIN_TOKEN=<ADMIN_TOKEN>
PUBLISHABLE_API_KEY=<PUBLISHABLE_API_KEY>
DEFAULT_STORE_ID=default_store
TEST_STORE_ID=test_store
RUN_PHASE2B_S2BDIY=false
AI_WORKER_MOCK_GENERATION=true
```

Do not commit `scripts/dev3-full-backend-pipeline.local.env`.

## 7. Run Dev3 Full Backend Pipeline

```bash
source scripts/dev3-full-backend-pipeline.local.env
bash scripts/dev3-full-backend-pipeline.sh
```

Expected default result:

- Overall `PASS`
- product rating/review tests `PASS`
- Phase 2B real S2BDIY `SKIPPED` unless explicitly enabled
- Unified Newman `PASS`

The pipeline includes a dedicated product rating/review stage:

```bash
npm --workspace apps/medusa-backend run test -- rating
```

This stage is intentionally separate from full backend Jest so rating regressions are visible in Dev3 output.

## 8. Optional Real S2BDIY Sandbox Tests

Default behavior:

- `RUN_PHASE2B_S2BDIY=false`: all real S2BDIY calls are skipped.
- `RUN_PHASE2B_S2BDIY=true` with missing credentials/config: skipped, not failed.
- S2BDIY readiness/unit tests still run.

No-payment Phase 1 sandbox product generation:

```bash
RUN_PHASE2B_S2BDIY=true
S2BDIY_TEST_MODE=true
S2BDIY_BASE_URL=https://opentest.s2bdiy.com
S2BDIY_APP_KEY=wm001
S2BDIY_APP_SECRET=<secret>
S2BDIY_BASIC_PRODUCT_ID=2864
S2BDIY_COLOR_ID=5
S2BDIY_SIZE_ID=21
S2BDIY_VIEW_ID=1
S2BDIY_LOGISTICS_ID=294
```

This can run:

- `POST /open/v1/accessToken`
- `GET /open/v1/basicProduct/categorys`
- `GET /open/v1/basicProduct`
- `GET /open/v1/basicProduct/{id}`
- `POST /open/v1/material/uploadMaterial`
- `GET /open/v1/material/{id}`
- `POST /open/v1/product/quickCreate`
- `GET /open/v1/product/{id}`

Create unpaid order only when both gates are true:

```bash
S2BDIY_ALLOW_CREATE_ORDER=true
S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE=true
```

Payment is stronger-gated and must never be enabled casually:

```bash
S2BDIY_ALLOW_PAYMENT=true
HUMAN_APPROVED_PAYMENT=true
```

Only when all gates are true may the pipeline call:

```text
POST /open/v1/orderPay
```

After sandbox payment, the pipeline/dry-run report records:

- `supplier_order_id`
- `external_order_id`
- `product_amount`
- `shipping_amount`
- `discount_amount`
- `total_amount`
- `pay_status` / `pay_status_text`
- `status` / `status_text`
- `order_logistics`
- `tracking_number`, if present

If tracking remains empty while the supplier status is review/audit, record:

```text
PASS_TO_PAYMENT_BUT_TRACKING_BLOCKED_BY_TEST_ENV_MANUAL_REVIEW
```

This is not a backend failure. S2BDIY technical support confirmed that the test environment requires manual review and currently does not process test orders through final tracking.

The Dev3 pipeline and dry-run script must not call:

- `POST /open/v1/order/{id}/logistics`
- `POST /open/v1/childUser`
- `POST /open/v1/store`
- `POST /open/v1/product/{id}/copy`
- `DELETE /open/v1/order/{id}`

## 9. Product Rating / Review Tests

Run directly:

```bash
npm --workspace apps/medusa-backend run test -- rating
```

Coverage includes:

- verified buyer creates review
- review summary/list query
- `rating=1`
- `rating=5`
- invalid `rating=0`, `6`, negative, decimal, and string values
- missing order number
- nonexistent/cross-store product id
- cross-store order rejection
- order without product rejection
- duplicate review rejection

The Dev3 pipeline now includes this as an explicit stage.

## 10. Troubleshooting

`ADMIN_TOKEN` length is tiny, `replace_me`, or about 14 characters:

- The token is probably invalid.
- Re-authenticate with `/auth/user/emailpass`.

`/admin/auth` returns empty token:

- Use `/auth/user/emailpass`; this is the current Medusa v2 path.

`jq` parse error from `/admin/publishable-api-keys`:

- The endpoint probably returned HTML or `404`.
- Use `/admin/api-keys` or inspect the local `api_key` table.

`PUBLISHABLE_API_KEY=pk_replace...`:

- Storefront calls may return `400` or `401`.
- Replace with a real local publishable key.

AI Worker `8001` not running:

- Start mock worker with `AI_WORKER_MOCK_GENERATION=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8001`.

S2BDIY network or VPN issue:

- Codex may timeout while a local terminal with VPN succeeds.
- Do not mark CitiGoo backend failed until token/detail calls are retried from the same network context.

S2BDIY tracking blocked:

- Sandbox payment can succeed while tracking remains empty.
- Treat supplier manual review as an external test-environment blocker.

Dirty local files:

- Do not commit local env, logs, generated supplier reports, tokens, or secrets.

## 11. Validation Commands

```bash
bash -n scripts/dev3-full-backend-pipeline.sh
npm --workspace apps/medusa-backend run test -- rating
npm --workspace apps/medusa-backend run test -- s2bdiy
npm --workspace apps/medusa-backend run test
```

Run the full pipeline only when local services and env are ready:

```bash
source scripts/dev3-full-backend-pipeline.local.env
bash scripts/dev3-full-backend-pipeline.sh
```
