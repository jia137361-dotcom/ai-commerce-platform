# Testing Entry Point

This is the canonical testing entry point for local Phase 1, Phase 2A, and Phase 2B backend validation.

Keep this file concise. Detailed command-by-command instructions should live in the linked runbooks, scripts, and supplier-specific docs.

Recommended one-command Dev3 backend validation entry:

```bash
bash scripts/dev3-full-backend-pipeline.sh
```

This script orchestrates Dev1 supplier foundation checks, Dev2 Phase 1 regression, Dev2 Phase 2A E2E, Dev3 smoke coverage, unified Phase 1/2A/2B Newman, and Phase 2B S2BDIY readiness / optional real supplier smoke.

Do not commit:

- `apps/medusa-backend/.env`
- real `PUBLISHABLE_API_KEY`
- real `ADMIN_TOKEN`
- Stripe / DeepSeek / FAL / supplier API keys
- generated AI images
- local logs
- virtual environments
- `node_modules`
- generated self-test output containing local keys or tokens

## Recommended Validation Order

Use this order for local Dev3 integration validation. Detailed setup commands live in the linked runbooks; this file is the quick entry point.

### Stage 0: Clean Tree And Dependencies

```bash
git status --short
test -x node_modules/.bin/medusa || npm install --include=dev
```

Do not commit `package-lock.json` changes from a local reinstall unless a `package.json` file changed intentionally.

### Stage 1: Static Checks

```bash
npx tsc --noEmit -p apps/medusa-backend/tsconfig.json
npm test --workspace apps/medusa-backend
npm test --workspace apps/medusa-backend -- s2bdiy

bash -n scripts/phase1-dev2-self-test.sh
bash -n scripts/phase2a-dev2-e2e.sh
bash -n scripts/smoke-store-isolation.sh
bash -n scripts/phase2b-e2e.sh
bash -n scripts/s2bdiy-api-smoke.sh
bash -n scripts/s2bdiy-error-cases.sh

jq empty postman/ai-commerce-store-isolation.postman_collection.json
jq empty postman/ai-commerce-local.example.postman_environment.json
```

If a Python 3.10+ environment is available:

```bash
cd apps/ai-worker
AI_WORKER_MOCK_GENERATION=true python -m pytest -q
cd ../..
```

### Stage 2: Database And Bootstrap

```bash
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps

npm --workspace apps/medusa-backend run db:migrate
npm run seed

cd apps/medusa-backend
npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts
cd ../..
```

After bootstrap, extract and validate bridge ids from `prod_phase1_default` and `prod_phase1_test`. Do not blindly choose the first `is_cart_addable` product from a dirty local DB.

### Stage 3: Services And Local Env

Verify Medusa and AI Worker health:

```bash
curl -i http://localhost:9000/health
curl -sS http://localhost:8001/health | jq .
```

Load local env and refresh credentials when needed:

```bash
set -a
source apps/medusa-backend/.env
set +a
```

Refresh `ADMIN_TOKEN` if `/admin/users/me` returns 401. Verify `PUBLISHABLE_API_KEY` with `GET /store/products`.

### Stage 4: Phase 1 Regression

```bash
bash scripts/phase1-dev2-self-test.sh
```

Expected coverage:

- store context resolution
- product/category/store isolation
- product-to-cart bridge
- `variant_id`-only add-to-cart
- same-store add-to-cart
- cross-store `CART_STORE_MISMATCH`
- cart complete, order paid, fulfillment waiting/pushed/shipped

### Stage 5: Phase 2A E2E

```bash
PHASE2A_E2E_COMPLETE=true bash scripts/phase2a-dev2-e2e.sh
```

Expected coverage:

- AI Worker mock generation
- `POST /admin/ai/generate-and-draft`
- publish
- store product list/detail fields
- cart add by `variant_id`
- line-item production metadata
- complete paid order
- fulfillment waiting/push/mock shipment where admin token is available

### Stage 6: Dev3 Smoke And Newman

```bash
PUBLISHABLE_API_KEY="$PUBLISHABLE_API_KEY" \
ADMIN_TOKEN="$ADMIN_TOKEN" \
DEFAULT_MEDUSA_PRODUCT_ID="$DEFAULT_MEDUSA_PRODUCT_ID" \
DEFAULT_MEDUSA_VARIANT_ID="$DEFAULT_MEDUSA_VARIANT_ID" \
TEST_MEDUSA_PRODUCT_ID="$TEST_MEDUSA_PRODUCT_ID" \
TEST_MEDUSA_VARIANT_ID="$TEST_MEDUSA_VARIANT_ID" \
bash scripts/smoke-store-isolation.sh
```

Expected: `All store isolation smoke tests passed.`

Run unified Newman:

```bash
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
  --env-var "test_medusa_variant_id=$TEST_MEDUSA_VARIANT_ID" \
  --env-var "run_phase2b_s2bdiy=${RUN_PHASE2B_S2BDIY:-false}" \
  --env-var "s2bdiy_base_url=${S2BDIY_API_BASE_URL:-https://opentest.s2bdiy.com}" \
  --env-var "s2bdiy_client_id=$S2BDIY_APP_KEY" \
  --env-var "s2bdiy_client_secret=$S2BDIY_APP_SECRET" \
  --env-var "s2bdiy_app_secret=$S2BDIY_APP_SECRET" \
  --env-var "s2bdiy_basic_product_id=$S2BDIY_TEST_BASIC_PRODUCT_ID" \
  --env-var "s2bdiy_size_id=$S2BDIY_TEST_SIZE_ID" \
  --env-var "s2bdiy_color_id=$S2BDIY_TEST_COLOR_ID" \
  --env-var "s2bdiy_view_id=$S2BDIY_TEST_VIEW_ID" \
  --env-var "s2bdiy_logistics_id=$S2BDIY_TEST_LOGISTICS_ID"
```

Expected Newman result: `failed: 0`. Phase 2B lives in the same collection and is credential-dependent. Keep `run_phase2b_s2bdiy=false` when S2BDIY credentials are missing; in that mode Phase 2B is `SKIPPED`, not `FAILED`. Set `run_phase2b_s2bdiy=true` only when the S2BDIY sandbox env is ready.

### Stage 7: Phase 2B Supplier Validation

```bash
npm test --workspace apps/medusa-backend -- s2bdiy
bash scripts/s2bdiy-api-smoke.sh
bash scripts/s2bdiy-error-cases.sh
bash scripts/phase2b-e2e.sh
```

Real S2BDIY smoke and the full Phase 2B E2E require local sandbox supplier credentials and test account readiness. If `S2BDIY_APP_SECRET`, supplier store id, logistics id, or test balance are not configured, document the skip instead of treating it as a platform regression.

### Stage 8: Manual UI/Admin Verification

- Medusa Admin shows generated orders.
- Order payment and fulfillment status are visible.
- Store API product detail exposes mockup, print-file, supplier, and bridge fields.
- Frontend validation is run only when frontend changes are part of the current PR.

### Stage 9: Final Cleanup

```bash
git status --short
git diff --check
git grep -lE "pk_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}|sk_[A-Za-z0-9]|FAL_KEY=.*[A-Za-z0-9]{10,}|DEEPSEEK_API_KEY=.*[A-Za-z0-9]{10,}|STRIPE_API_KEY=.*[A-Za-z0-9]{10,}|S2BDIY.*=.*[A-Za-z0-9]{10,}" -- docs postman scripts apps/medusa-backend/src apps/frontend || true
```

Restore generated local result files, logs, images, migration snapshot noise, and `.env` changes before pushing.

Push only after the cleanup checks pass:

```bash
git push origin <branch-name>
```

## Ownership Map

| Owner | Coverage |
| --- | --- |
| Dev1 supplier foundation | Supplier seed, T-shirt SKU matrix, print spec, design template, supplier product/basic product data. |
| Dev2 Phase 1 regression | Store context, product/category/store isolation, product-to-cart bridge, `variant_id` add-to-cart, cart complete, order, fulfillment. |
| Dev2 Phase 2A E2E | AI generate-and-draft, publish, storefront product detail fields, cart add, complete, line-item production metadata. |
| Dev2 Phase 2B supplier flow | S2BDIY token, upload material, quickCreate, product detail, logistics calculation, create supplier order, orderPay, order detail polling, tracking sync. |
| Dev3 | Schema/API/testing docs, supplier mapping docs, smoke coverage, Postman/Newman or Apifox coverage, final integration validation. |

## Required Services

- Docker Postgres on `localhost:5432`.
- Docker Redis on `localhost:6379`.
- Medusa backend on `http://localhost:9000`.
- AI Worker on `http://localhost:8001` for AI generation / print-file flow.
- Frontend, if UI validation is required.
- For Phase 2B real supplier tests, S2BDIY sandbox credentials or mock adapter configuration must be available.

## Required Local Env

Use `apps/medusa-backend/.env` for local values only.

Required for Phase 1 / Phase 2A:

- `DATABASE_URL=postgres://medusa:medusa@localhost:5432/ai_commerce`
- `REDIS_URL=redis://localhost:6379`
- `DEFAULT_STORE_ID=default_store`
- `ADMIN_TOKEN`
- `PUBLISHABLE_API_KEY`
- `AI_WORKER_BASE_URL=http://localhost:8001`
- `AI_WORKER_MOCK_GENERATION=true`
- `MEDUSA_BASE_URL=http://localhost:9000`
- `AI_WORKER_PUBLIC_BASE_URL=http://localhost:8001/static`
- `DEFAULT_MEDUSA_PRODUCT_ID`
- `DEFAULT_MEDUSA_VARIANT_ID`
- `TEST_MEDUSA_PRODUCT_ID`
- `TEST_MEDUSA_VARIANT_ID`

Mock-mode notes:

- `STRIPE_API_KEY` can be empty locally when tests use `pp_system_default`.
- `DEEPSEEK_API_KEY` can be empty when `AI_WORKER_MOCK_GENERATION=true`.
- `FAL_KEY` can be empty when `AI_WORKER_MOCK_GENERATION=true`.
- `PUBLISHABLE_API_KEY` and `ADMIN_TOKEN` are local-only and must not be committed.

Required for Phase 2B S2BDIY validation depends on the current adapter implementation. Expected local-only values may include:

- S2BDIY API base URL / sandbox base URL
- S2BDIY access token credentials
- test `basic_product_id`
- test `size_id`
- test `color_id`
- test `view_id`
- test `logistics_id`
- test print file / material id

Do not commit real supplier credentials.

## Bootstrap Requirement

Run the bootstrap before cart/add-to-cart tests:

```bash
npm run seed

cd apps/medusa-backend
npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts
cd ../..
```

Use the bootstrap output:

- `DEFAULT_MEDUSA_VARIANT_ID` must come from `prod_phase1_default`.
- `TEST_MEDUSA_VARIANT_ID` must come from `prod_phase1_test`.
- Do not blindly choose the first `is_cart_addable` product from a dirty local DB.

## Quick Commands

Start dependencies, migrate, seed, and bootstrap:

```bash
docker compose -f infra/docker-compose.yml up -d

npm --workspace apps/medusa-backend run db:migrate
npm run seed

cd apps/medusa-backend
npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts
cd ../..
```

Static and unit checks:

```bash
npx tsc --noEmit -p apps/medusa-backend/tsconfig.json
npm test --workspace apps/medusa-backend

cd apps/ai-worker
AI_WORKER_MOCK_GENERATION=true python -m pytest -q
cd ../..
```

Runtime validation:

```bash
bash scripts/phase1-dev2-self-test.sh
PHASE2A_E2E_COMPLETE=true bash scripts/phase2a-dev2-e2e.sh
PUBLISHABLE_API_KEY="$PUBLISHABLE_API_KEY" \
ADMIN_TOKEN="$ADMIN_TOKEN" \
DEFAULT_MEDUSA_PRODUCT_ID="$DEFAULT_MEDUSA_PRODUCT_ID" \
DEFAULT_MEDUSA_VARIANT_ID="$DEFAULT_MEDUSA_VARIANT_ID" \
TEST_MEDUSA_PRODUCT_ID="$TEST_MEDUSA_PRODUCT_ID" \
TEST_MEDUSA_VARIANT_ID="$TEST_MEDUSA_VARIANT_ID" \
bash scripts/smoke-store-isolation.sh
bash scripts/phase2b-e2e.sh
```

Postman/Newman:

```bash
set -a
source apps/medusa-backend/.env
set +a

npx newman run postman/ai-commerce-store-isolation.postman_collection.json \
  --env-var "base_url=${MEDUSA_BASE_URL:-http://localhost:9000}" \
  --env-var "ai_worker_base_url=${AI_WORKER_BASE_URL:-http://localhost:8001}" \
Postman files:

- Collection: `postman/ai-commerce-store-isolation.postman_collection.json`
- Local example environment: `postman/ai-commerce-local.example.postman_environment.json`
- The same collection contains Phase 1, Dev1 supplier foundation, Phase 2A, and optional Phase 2B S2BDIY folders.

## Phase 1 Required Coverage

Store context:

- `resolveCurrentStore` returns `X-Store-Id` when a non-empty header is present.
- `X-Store-Id` takes precedence over host/default fallback.
- Empty `X-Store-Id` is ignored.
- Localhost requests without `X-Store-Id` resolve to `DEFAULT_STORE_ID`.
- Non-localhost requests without `X-Store-Id` resolve to `DEFAULT_STORE_ID`.
- `DEFAULT_STORE_ID` falls back to `default_store` when the env var is unset.
- The returned `source` value is correct for header, host, and default paths.

Seed:

- Seed creates `default_store` when missing.
- Seed creates `test_store` when missing.
- Seed is idempotent when both stores already exist.
- Seed respects `DEFAULT_STORE_ID` for the default store id.

Product and category isolation:

- `GET /store/products` only returns published products for the resolved store.
- `GET /store/products/:product_id` returns a current-store published product.
- Product detail for another store returns not found.
- Draft products are not returned by storefront product APIs.
- Product draft creation accepts current-store `category_ids`.
- Product draft creation rejects another store's `category_ids`.
- `GET /store/product-categories` only returns categories for the resolved store.
- `GET /admin/product-categories` only returns categories for the resolved store.

Product-to-cart bridge:

- `/store/products` and `/store/products/:product_id` return `medusa_product_id`, `medusa_variant_id`, and `is_cart_addable`.
- Products without `medusa_variant_id` return `is_cart_addable: false`.
- Products with a valid `medusa_variant_id` return `is_cart_addable: true`.
- Add-to-cart uses `variant_id = medusa_variant_id`.
- `product_id` / `mc_product.id` add-to-cart is not supported.
- Same-store cart line-item add succeeds.
- Cross-store variant add returns `CART_STORE_MISMATCH`.

## Phase 2A Required Coverage

Phase 2A validates the AI product generation to order path:

- AI Worker health.
- `POST /admin/ai/generate-and-draft`.
- AI product draft includes:
  - `supplier_id`
  - `supplier_product_id`
  - `supplier_variant_id`
  - `design_image_url`
  - `mockup_image_url`
  - `print_file_url`
  - `medusa_product_id`
  - `medusa_variant_id`
- Publish succeeds.
- `/store/products` and `/store/products/:id` expose Phase 2A fields.
- Cart creation succeeds.
- Add line item succeeds with `variant_id`.
- Line-item metadata includes:
  - `supplier_id`
  - `supplier_product_id`
  - `supplier_variant_id`
  - `print_file_url`
  - `print_position`
  - `color`
  - `size`
- Cart complete returns `payment_status=paid`.
- Fulfillment enters waiting/pushed/shipped flow where applicable.

For the full local command-by-command Phase 2A validation flow, see [phase2a-test-runbook.md](./phase2a-test-runbook.md).

## Phase 2B Required Coverage

Phase 2B extends the Phase 2A product/order path into supplier fulfillment.

The final integration flow is:

```text
AI product
→ upload material
→ quickCreate
→ product detail displays supplier mockup
→ publish
→ cart
→ payment paid
→ logisticsCalculation
→ create S2BDIY order
→ orderPay
→ order detail polling
→ tracking sync
```

Required validation areas:

- S2BDIY auth/token handling.
- Material upload from AI-generated print file.
- quickCreate supplier product creation.
- Supplier product detail returns usable image/mockup data.
- Published CitiGoo product exposes supplier-created product data where applicable.
- Store cart can add the product by `variant_id`.
- Payment completion creates a CitiGoo paid order.
- Logistics calculation returns usable logistics information.
- Supplier order creation returns supplier order id.
- Supplier payment push succeeds or returns a documented error.
- Supplier order detail polling maps supplier status to internal status.
- Tracking sync updates shipment/order state when tracking becomes available.

Expected scripts and assets:

- `scripts/phase2b-e2e.sh`
- `scripts/s2bdiy-api-smoke.sh`
- `scripts/s2bdiy-error-cases.sh`
- `scripts/test-assets/test-print.png`
- `docs/suppliers/s2bdiy.md`
- `postman/ai-commerce-store-isolation.postman_collection.json`
- `postman/ai-commerce-local.example.postman_environment.json`

Credential behavior:

- Unit/static S2BDIY coverage can run without real supplier credentials.
- `scripts/phase2b-e2e.sh` skips supplier sync when `S2BDIY_API_BASE_URL` is not set, then runs the Phase 2A baseline.
- `scripts/s2bdiy-api-smoke.sh` requires `S2BDIY_APP_SECRET` and real sandbox readiness.
- `orderPay` may fail in the supplier sandbox if the test account lacks prepaid balance; document that as an external supplier-account issue.

Expected backend coverage includes:

- S2BDIY auth tests.
- S2BDIY order id tests.
- S2BDIY status mapper tests.
- Supplier order sync route.
- Supplier order retry payment route.
- Supplier order tracking/status sync job.
- Store-core supplier order models and migration.

## Phase 2B Step 10 Integration Checklist

Dev3 should use this as the final checklist after Dev1/Dev2 Phase 2B pieces are merged.

Documentation must be complete:

- `docs/suppliers/s2bdiy.md`
- `docs/fulfillment.md` if present
- `docs/schema.md`
- `docs/api.md`
- `docs/testing.md`

S2BDIY field mapping must be clear:

- CitiGoo product → S2BDIY basic product
- CitiGoo print file → S2BDIY material
- CitiGoo product variant → S2BDIY `size_id` / `color_id`
- CitiGoo product image/mockup → S2BDIY product detail `show_images`
- CitiGoo order → S2BDIY order
- CitiGoo shipment → S2BDIY order logistics

Seed/test data must be repeatable:

- supplier = S2BDIY
- test `basic_product_id`
- test `size_id`
- test `color_id`
- test `view_id`
- test `print_file`
- test `material_id`
- test `supplier_product_id`
- test `logistics_id`
- test supplier order

Postman / Apifox / smoke scripts should cover:

- get token
- get basic product detail
- upload material
- quickCreate product
- get product detail
- logistics calculation
- create order
- pay order
- get order detail
- sync tracking

Status flow should be verified:

- CitiGoo order paid
- `supplier_order_created`
- `supplier_payment_pending`
- `supplier_paid`
- `supplier_reviewing`
- `supplier_in_production`
- `supplier_shipped`
- `shipment_created`

Failure scenarios should have explicit errors:

- token expired
- material upload failed
- quickCreate failed
- product detail has no image
- missing `logistics_id`
- create order failed
- orderPay failed
- order detail polling failed
- tracking is empty

Supplier-specific command details should live in supplier docs and Postman/Apifox collections, not in this entry file.

For S2BDIY auth, material upload, quickCreate, logistics, supplier order, orderPay, polling, tracking, and failure-case details, see [suppliers/s2bdiy.md](./suppliers/s2bdiy.md).

## Postman Store Isolation And Phase 2A Collection

Import:

```text
postman/ai-commerce-store-isolation.postman_collection.json
```

The collection includes:

- `Phase 1 / Store Isolation Regression`
- `Phase 2A - AI Product E2E`

It covers:

- health and store-context checks
- missing publishable API key rejection
- admin bearer token auth
- category/product store isolation
- cross-store publish/category/detail rejection
- product-to-cart bridge
- AI Worker health
- supplier foundation checks
- generate-and-draft
- publish
- store product detail
- cart create
- add line item
- complete cart
- admin order visibility
- push fulfillment
- mock shipment

## Detailed Docs

- Phase 2A full local runbook: [phase2a-test-runbook.md](./phase2a-test-runbook.md)
- Dev2 Phase 1 regression: [phase1-dev2-self-test.md](./phase1-dev2-self-test.md)
- API reference: [api.md](./api.md)
- Schema reference: [schema.md](./schema.md)
- Store context: [store-context.md](./store-context.md)
- S2BDIY supplier docs: [suppliers/s2bdiy.md](./suppliers/s2bdiy.md)
- AI Worker setup: `apps/ai-worker/README.md`

## Common Failures

`A valid publishable key is required`

- Refresh `PUBLISHABLE_API_KEY`.
- Verify with `GET /store/products`.

`ADMIN_TOKEN` returns 401

- Refresh the token with `POST /auth/user/emailpass`.
- Store it only in local `.env` or your shell.

`Cannot read properties of undefined (reading 'calculated_amount')`

- The selected native variant does not have a calculated price for the cart currency/region.
- Run `phase1-dev2-bootstrap` again.
- Update `DEFAULT_MEDUSA_VARIANT_ID` from `prod_phase1_default`.

`Some variant does not have the required inventory`

- The selected native variant is not cart-ready for local stock checks.
- Run `phase1-dev2-bootstrap` and use its output ids.

AI Worker connection refused:

- Start AI Worker on `127.0.0.1:8001`.
- Use Python 3.10+; Python 3.13 is recommended.

Python FastAPI or dependency errors:

- Do not use Python 3.9 for Phase 2A validation.
- Install `apps/ai-worker/requirements.txt` in the active Python 3.10+ environment.

`customer_email` unrecognized in cart create:

- Current cart create tests should use `currency_code` and optional `region_id` only unless the route changes.

Duplicate entity names in MikroORM:

- Remove duplicate local files such as `* 2.ts`, `* 2.py`, `* 2.sh`, or generated JS files under `src`.
- Run `git status --short`.
- Run `find apps docs postman scripts -name '* 2.*' -print`.
- Delete only duplicated local copies, then rerun `npm run seed`.

S2BDIY token expired:

- Refresh S2BDIY credentials / token.
- Re-run the supplier API smoke test.

S2BDIY material upload failed:

- Verify the print file exists and is readable.
- Verify accepted image format and size constraints.
- Check supplier API response body before retrying quickCreate.

S2BDIY orderPay failed:

- Verify supplier order id exists.
- Verify logistics selection and order amount.
- Re-run order detail polling to determine whether the supplier order was created but not paid.
- If the S2BDIY sandbox account has no prepaid balance, the real supplier smoke may fail externally even when CitiGoo integration code is working.

## Final PR Checklist

Before PR:

- Worktree is clean except intentional docs/test assets.
- TypeScript check passed.
- Backend Jest passed.
- S2BDIY Jest subset passed.
- Seed and `phase1-dev2-bootstrap` passed.
- Phase 1 regression passed.
- Phase 2A E2E passed.
- Dev3 smoke passed.
- Newman passed with `failed: 0`.
- S2BDIY real smoke either passed or is explicitly skipped due to missing local supplier credentials or sandbox balance.
- No `.env`, secrets, local result files, logs, generated images, venvs, `node_modules`, or migration snapshot noise are committed.

## Future Regression Backlog

Keep these visible as follow-up regression areas:

- Store settings isolation.
- `body.store_id` override behavior.
- Unknown store behavior.
- Future cart/order isolation hardening.
- Payment/webhook flows cannot update another store's cart or order.
- API documentation and collection maintenance.
