# Phase 2A Dev3 Test Runbook

This runbook is the Dev3 local validation flow for Phase 2A. It covers Dev1 supplier foundation, Dev2 Phase 1 regression, Phase 2A AI generate-and-draft, product detail bridge fields, cart add-to-cart metadata, order completion, and mock fulfillment.

Do not commit secrets, `apps/medusa-backend/.env`, generated AI Worker static images, virtual environments, local logs, or generated self-test output with real keys.

## Required Services

- Docker Postgres and Redis.
- Medusa backend at `http://localhost:9000`.
- AI Worker at `http://localhost:8001`.

Start Docker services:

```bash
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
```

Run migrations and seed:

```bash
npm --workspace apps/medusa-backend run db:migrate
npm run seed
```

Start Medusa:

```bash
rm -rf apps/medusa-backend/.medusa
mkdir -p /tmp/ai-commerce-logs
npm --workspace apps/medusa-backend run dev
```

Start AI Worker in mock mode with Python 3.10+:

```bash
cd apps/ai-worker
AI_WORKER_MOCK_GENERATION=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Verify services:

```bash
curl -i http://localhost:9000/health
curl -sS http://127.0.0.1:8001/health | jq .
```

## Required Local Env

Use `apps/medusa-backend/.env` for local values:

```text
DATABASE_URL=postgres://medusa:medusa@localhost:5432/ai_commerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev_jwt_secret
COOKIE_SECRET=dev_cookie_secret
DEFAULT_STORE_ID=default_store
AI_WORKER_BASE_URL=http://localhost:8001
AI_WORKER_MOCK_GENERATION=true
MEDUSA_BASE_URL=http://localhost:9000
AI_WORKER_PUBLIC_BASE_URL=http://localhost:8001/static
```

Also set local-only values:

```text
ADMIN_TOKEN=<local_admin_jwt>
PUBLISHABLE_API_KEY=<local_publishable_api_key>
DEFAULT_MEDUSA_PRODUCT_ID=<bootstrap_default_native_product_id>
DEFAULT_MEDUSA_VARIANT_ID=<bootstrap_default_native_variant_id>
TEST_MEDUSA_PRODUCT_ID=<bootstrap_test_native_product_id>
TEST_MEDUSA_VARIANT_ID=<bootstrap_test_native_variant_id>
```

Mock mode notes:

- `STRIPE_API_KEY` can be empty because local complete uses `pp_system_default`.
- `DEEPSEEK_API_KEY` can be empty when `AI_WORKER_MOCK_GENERATION=true`.
- `FAL_KEY` can be empty when `AI_WORKER_MOCK_GENERATION=true`.

## Refresh ADMIN_TOKEN

Create the local admin user if needed:

```bash
cd apps/medusa-backend
npx medusa user -e admin@example.com -p supersecret
cd ../..
```

Log in:

```bash
export BASE_URL="http://localhost:9000"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="supersecret"

curl -sS -X POST "$BASE_URL/auth/user/emailpass" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | tee /tmp/admin-login.json | jq '.'

export ADMIN_TOKEN=$(jq -r '.token // .access_token // empty' /tmp/admin-login.json)
echo "ADMIN_TOKEN length: ${#ADMIN_TOKEN}"
```

Verify:

```bash
curl -i "$BASE_URL/admin/users/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected: HTTP `200`.

## Get PUBLISHABLE_API_KEY

List local API keys through Admin API:

```bash
curl -sS "$BASE_URL/admin/api-keys?limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.api_keys[]? | {id, title, type, token}'
```

Pick a key where `type` is publishable and export it:

```bash
export PUBLISHABLE_API_KEY="<pk_...>"
```

Verify:

```bash
curl -i "$BASE_URL/store/products" \
  -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" \
  -H "X-Store-Id: default_store"
```

Expected: HTTP `200`.

## Required Bootstrap

Before Phase 1 or Phase 2A cart tests, run:

```bash
npm run seed

cd apps/medusa-backend
npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts
cd ../..
```

This creates or updates:

- `prod_phase1_default`
- `prod_phase1_test`
- native Medusa products and variants for both stores
- price sets for the selected variants
- cart-ready native variants for local tests

Copy the bootstrap output into local `.env`:

```text
DEFAULT_MEDUSA_PRODUCT_ID=<default_store.medusa_product_id>
DEFAULT_MEDUSA_VARIANT_ID=<default_store.medusa_variant_id>
TEST_MEDUSA_PRODUCT_ID=<test_store.medusa_product_id>
TEST_MEDUSA_VARIANT_ID=<test_store.medusa_variant_id>
```

If the terminal output scrolled away, extract the bridge ids from the store product API. Prefer the fixed bootstrap product ids:

Do not blindly choose the first `is_cart_addable` product from a dirty local DB. Prefer:

```bash
DEFAULT_BRIDGE_PRODUCT_JSON=$(curl -sS "$BASE_URL/store/products" \
  -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" \
  -H "X-Store-Id: default_store" \
  | jq '.products[] | select(.product_id == "prod_phase1_default")')

TEST_BRIDGE_PRODUCT_JSON=$(curl -sS "$BASE_URL/store/products" \
  -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" \
  -H "X-Store-Id: test_store" \
  | jq '.products[] | select(.product_id == "prod_phase1_test")')

echo "$DEFAULT_BRIDGE_PRODUCT_JSON" | jq '{product_id, medusa_product_id, medusa_variant_id, is_cart_addable}'
echo "$TEST_BRIDGE_PRODUCT_JSON" | jq '{product_id, medusa_product_id, medusa_variant_id, is_cart_addable}'
```

Export the ids:

```bash
export DEFAULT_MEDUSA_PRODUCT_ID=$(echo "$DEFAULT_BRIDGE_PRODUCT_JSON" | jq -r '.medusa_product_id')
export DEFAULT_MEDUSA_VARIANT_ID=$(echo "$DEFAULT_BRIDGE_PRODUCT_JSON" | jq -r '.medusa_variant_id')
export TEST_MEDUSA_PRODUCT_ID=$(echo "$TEST_BRIDGE_PRODUCT_JSON" | jq -r '.medusa_product_id')
export TEST_MEDUSA_VARIANT_ID=$(echo "$TEST_BRIDGE_PRODUCT_JSON" | jq -r '.medusa_variant_id')
```

Write the ids back to local `.env`:

```bash
python3 - <<'PY'
import os
from pathlib import Path

p = Path("apps/medusa-backend/.env")
text = p.read_text() if p.exists() else ""

updates = {
    "DEFAULT_MEDUSA_PRODUCT_ID": os.environ["DEFAULT_MEDUSA_PRODUCT_ID"],
    "DEFAULT_MEDUSA_VARIANT_ID": os.environ["DEFAULT_MEDUSA_VARIANT_ID"],
    "TEST_MEDUSA_PRODUCT_ID": os.environ["TEST_MEDUSA_PRODUCT_ID"],
    "TEST_MEDUSA_VARIANT_ID": os.environ["TEST_MEDUSA_VARIANT_ID"],
}

lines = text.splitlines()
seen = set()
for i, line in enumerate(lines):
    key = line.split("=", 1)[0]
    if key in updates:
        lines[i] = f"{key}={updates[key]}"
        seen.add(key)

for key, value in updates.items():
    if key not in seen:
        lines.append(f"{key}={value}")

p.write_text("\\n".join(lines) + "\\n")
PY
```

## Dev1 Supplier Foundation Checks

Admin route:

```bash
curl -sS "$BASE_URL/admin/supplier-products?platform_product_id=pp_tshirt" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Store-Id: default_store" | jq .
```

Store route:

```bash
curl -sS "$BASE_URL/store/supplier-products?platform_product_id=pp_tshirt" \
  -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" \
  -H "X-Store-Id: default_store" | jq .
```

Expected seed data:

- supplier `sup_citigoo_mock`
- supplier product `sp_tshirt`
- platform product `pp_tshirt`
- variants for Black/White and sizes S/M/L/XL
- supplier variant `spv_tshirt_black_m`
- front print spec `sps_tshirt_front_png`
- accepted format `png`
- design template `pdt_tshirt_front`

## Dev2 Phase 1 Regression

Run:

```bash
bash scripts/phase1-dev2-self-test.sh
```

Expected:

- same-store add-to-cart HTTP `200`
- cross-store add-to-cart returns `CART_STORE_MISMATCH`
- complete creates an order
- `payment_status=paid`
- fulfillment enters `waiting`, then admin push/mock shipment can move it to `pushed`/`shipped`

## Static Checks And Unit Tests

Run backend type checks and tests:

```bash
npx tsc --noEmit -p apps/medusa-backend/tsconfig.json
npm test --workspace apps/medusa-backend
```

Run shell syntax checks:

```bash
bash -n scripts/phase1-dev2-self-test.sh
bash -n scripts/phase2a-dev2-e2e.sh
bash -n scripts/smoke-store-isolation.sh
```

Run AI Worker tests in mock mode:

```bash
cd apps/ai-worker
AI_WORKER_MOCK_GENERATION=true python -m pytest -q
cd ../..
```

## Dev2 Phase 2A E2E

Run:

```bash
PHASE2A_E2E_COMPLETE=true bash scripts/phase2a-dev2-e2e.sh
```

Expected:

- AI Worker health OK
- `POST /admin/ai/generate-and-draft` creates an `mc_product` draft
- draft contains supplier ids, design/mockup/print URLs, and Medusa bridge ids
- publish succeeds
- `/store/products` and `/store/products/:id` expose Phase 2A fields
- cart creation succeeds
- line item is added using `variant_id = medusa_variant_id`
- line-item metadata includes `supplier_id`, `supplier_product_id`, `supplier_variant_id`, `print_file_url`, `print_position`, `color`, and `size`
- complete returns `payment_status=paid` and `fulfillment_status=waiting`

If `ADMIN_TOKEN` is available, verify fulfillment:

```bash
curl -sS -X POST "$BASE_URL/admin/orders/<order_id>/push-fulfillment" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Store-Id: default_store" | jq .

curl -sS -X POST "$BASE_URL/admin/orders/<order_id>/mock-shipment" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Store-Id: default_store" \
  -H "Content-Type: application/json" \
  --data '{"carrier":"mock","tracking_number":"MOCK-001","tracking_url":"https://example.com/track/MOCK-001"}' | jq .
```

## Dev3 Store Isolation Smoke

After bootstrap, run:

```bash
bash scripts/smoke-store-isolation.sh
```

Expected:

```text
All store isolation smoke tests passed.
```

## Postman/Newman Coverage

The Postman collection includes:

- `Phase 1 / Store Isolation Regression`
- `Phase 2A - AI Product E2E`

The Phase 2A folder covers:

- Medusa health.
- AI Worker health.
- `GET /admin/supplier-products`.
- `GET /store/supplier-products`.
- `POST /admin/ai/generate-and-draft`.
- `POST /admin/products/:id/publish`.
- `GET /store/products/:id`.
- `POST /store/carts`.
- `POST /store/carts/:id/line-items` with `variant_id`.
- `POST /store/carts/:id/complete`.
- `POST /admin/orders/:id/push-fulfillment`.
- `POST /admin/orders/:id/mock-shipment`.

Prerequisites:

- Medusa backend is running on `9000`.
- AI Worker is running on `8001`.
- `npm run seed` completed.
- `cd apps/medusa-backend && npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts` completed.
- Local `.env` has valid `PUBLISHABLE_API_KEY` and `ADMIN_TOKEN`.
- `DEFAULT_MEDUSA_VARIANT_ID` comes from the `prod_phase1_default` bootstrap product.

Run Newman from the repo root:

```bash
set -a
source apps/medusa-backend/.env
set +a

npx newman run postman/ai-commerce-store-isolation.postman_collection.json \
  --env-var "base_url=${MEDUSA_BASE_URL:-http://localhost:9000}" \
  --env-var "ai_worker_base_url=${AI_WORKER_BASE_URL:-http://localhost:8001}" \
  --env-var "publishable_api_key=$PUBLISHABLE_API_KEY" \
  --env-var "admin_token=$ADMIN_TOKEN" \
  --env-var "default_store_id=default_store" \
  --env-var "test_store_id=test_store" \
  --env-var "default_medusa_product_id=$DEFAULT_MEDUSA_PRODUCT_ID" \
  --env-var "default_medusa_variant_id=$DEFAULT_MEDUSA_VARIANT_ID" \
  --env-var "test_medusa_product_id=$TEST_MEDUSA_PRODUCT_ID" \
  --env-var "test_medusa_variant_id=$TEST_MEDUSA_VARIANT_ID"
```

Expected: `failed: 0`.

For Postman app import, use:

- `postman/ai-commerce-store-isolation.postman_collection.json`
- `postman/ai-commerce-local.example.postman_environment.json`

The example environment contains placeholders only. Replace them locally and do not commit real keys or tokens.

## Common Failures

`A valid publishable key is required`

- Refresh `PUBLISHABLE_API_KEY`.
- Verify with `GET /store/products`.

`Cannot read properties of undefined (reading 'calculated_amount')`

- The selected native variant does not have a calculated price for the cart currency/region.
- Run `cd apps/medusa-backend && npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts`.
- Update `DEFAULT_MEDUSA_VARIANT_ID` to the variant linked by `prod_phase1_default`.

`Some variant does not have the required inventory`

- The selected native variant is not cart-ready for local stock checks.
- Run the same bootstrap and use its output ids.

AI Worker connection refused:

- Start AI Worker on `127.0.0.1:8001`.
- Use Python 3.10+; Python 3.13 is recommended locally.

Python FastAPI or dependency errors:

- Use Python 3.10+ / 3.13, not Python 3.9.
- Install `apps/ai-worker/requirements.txt` into the active environment.

`customer_email` unrecognized in cart create:

- Current cart create tests should use `currency_code` and optional `region_id` only unless the route changes.
