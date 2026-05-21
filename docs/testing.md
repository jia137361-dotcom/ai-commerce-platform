# Testing Entry Point

This is the canonical testing entry point for local Phase 1 and Phase 2A backend validation. Keep it concise; use the linked runbooks for command-by-command detail.

Do not commit `apps/medusa-backend/.env`, real `PUBLISHABLE_API_KEY`, real `ADMIN_TOKEN`, generated AI images, local logs, virtual environments, `node_modules`, or generated self-test results that contain keys or tokens.

## Recommended Validation Order

1. Start local Postgres and Redis.
2. Run backend migrations and seed.
3. Run `phase1-dev2-bootstrap`.
4. Refresh `ADMIN_TOKEN` and verify `PUBLISHABLE_API_KEY`.
5. Start Medusa backend and AI Worker.
6. Run static checks and unit tests.
7. Run Dev1 supplier foundation checks.
8. Run Dev2 Phase 1 regression.
9. Run Dev2 Phase 2A E2E.
10. Run Dev3 smoke and Postman/Newman coverage.

## Ownership Map

| Owner | Coverage |
| --- | --- |
| Dev1 supplier foundation | Supplier seed, T-shirt SKU matrix, front PNG print spec, and T-shirt front design template. |
| Dev2 Phase 1 regression | Store context, product/category/store isolation, product-to-cart bridge, `variant_id` add-to-cart, cart complete, order, and fulfillment. |
| Dev2 Phase 2A E2E | AI generate-and-draft, publish, storefront detail fields, cart add, complete, and line-item production metadata. |
| Dev3 | Schema/API/testing docs, Postman/Newman collection, smoke coverage, and local validation runbook. |

## Required Services

- Docker Postgres on `localhost:5432`.
- Docker Redis on `localhost:6379`.
- Medusa backend on `http://localhost:9000`.
- AI Worker on `http://localhost:8001` for Phase 2A.

## Required Local Env

Use `apps/medusa-backend/.env` for local values only.

Required:

- `DATABASE_URL=postgres://medusa:medusa@localhost:5432/ai_commerce`
- `REDIS_URL=redis://localhost:6379`
- `ADMIN_TOKEN`
- `PUBLISHABLE_API_KEY`
- `DEFAULT_STORE_ID=default_store`
- `AI_WORKER_BASE_URL=http://localhost:8001`
- `AI_WORKER_MOCK_GENERATION=true`
- `MEDUSA_BASE_URL=http://localhost:9000`
- `AI_WORKER_PUBLIC_BASE_URL=http://localhost:8001/static`
- `DEFAULT_MEDUSA_PRODUCT_ID`
- `DEFAULT_MEDUSA_VARIANT_ID`
- `TEST_MEDUSA_PRODUCT_ID`
- `TEST_MEDUSA_VARIANT_ID`

Mock-mode notes:

- `STRIPE_API_KEY` can be empty locally because tests use `pp_system_default`.
- `DEEPSEEK_API_KEY` can be empty when `AI_WORKER_MOCK_GENERATION=true`.
- `FAL_KEY` can be empty when `AI_WORKER_MOCK_GENERATION=true`.
- `PUBLISHABLE_API_KEY` and `ADMIN_TOKEN` are local-only and must not be committed.

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

```bash
docker compose -f infra/docker-compose.yml up -d
npm --workspace apps/medusa-backend run db:migrate
npm run seed

cd apps/medusa-backend
npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts
cd ../..
```

Static/unit checks:

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
bash scripts/smoke-store-isolation.sh
```

Postman/Newman:

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

Postman files:

- Collection: `postman/ai-commerce-store-isolation.postman_collection.json`
- Local example environment: `postman/ai-commerce-local.example.postman_environment.json`

## Detailed Docs

- Phase 2A full local runbook: [phase2a-test-runbook.md](./phase2a-test-runbook.md)
- Dev2 Phase 1 regression: [phase1-dev2-self-test.md](./phase1-dev2-self-test.md)
- API reference: [api.md](./api.md)
- Schema reference: [schema.md](./schema.md)
- Store context: [store-context.md](./store-context.md)

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
