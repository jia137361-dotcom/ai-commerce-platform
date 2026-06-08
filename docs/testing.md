# Developer 3 Backend Integration Testing

This is the canonical Developer 3 entry point for full backend validation across Phase 1, Phase 2A, and Phase 2B.

For the full copy/paste runbook, including Admin token acquisition, publishable API key setup, AI Worker mock startup, product rating/review tests, and gated real S2BDIY sandbox flow, see:

```text
docs/testing/dev3-full-backend-pipeline.md
```

## Primary Command

Run the independent Dev3 pipeline:

```bash
bash scripts/dev3-full-backend-pipeline.sh
```

The Dev3 pipeline validates the backend from the outside through APIs and documented contracts. It does not call, source, or wrap the Dev1/Dev2 self-test scripts.

Use local overrides by copying:

```bash
cp scripts/dev3-full-backend-pipeline.example.env scripts/dev3-full-backend-pipeline.local.env
```

Do not commit `scripts/dev3-full-backend-pipeline.local.env`.

## What Not To Commit

- `apps/medusa-backend/.env`
- real `PUBLISHABLE_API_KEY`
- real `ADMIN_TOKEN`
- Stripe, DeepSeek, FAL, or supplier API keys
- S2BDIY sandbox secrets
- generated AI images
- local logs
- Python virtual environments
- `node_modules`
- generated local result files containing keys or tokens

## Required Local Services

- Docker Postgres on `localhost:5432`
- Docker Redis on `localhost:6379`
- Medusa backend on `http://127.0.0.1:9000`
- AI Worker on `http://127.0.0.1:8001` for Phase 2A runtime checks

Start AI Worker in mock mode when needed:

```bash
cd apps/ai-worker
AI_WORKER_MOCK_GENERATION=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

## Required Local Env

Required for Phase 1 / Phase 2A:

- `MEDUSA_BASE_URL`, default `http://127.0.0.1:9000`
- `AI_WORKER_BASE_URL`, default `http://127.0.0.1:8001`
- `PUBLISHABLE_API_KEY`
- `ADMIN_TOKEN`
- `DEFAULT_STORE_ID=default_store`

Mock-mode notes:

- `STRIPE_API_KEY` can be empty locally when tests use `pp_system_default`.
- `DEEPSEEK_API_KEY` can be empty when `AI_WORKER_MOCK_GENERATION=true`.
- `FAL_KEY` can be empty when `AI_WORKER_MOCK_GENERATION=true`.

Optional for real Phase 2B S2BDIY:

- `RUN_PHASE2B_S2BDIY` set to `true`
- `S2BDIY_BASE_URL` or `S2BDIY_API_BASE_URL`
- `S2BDIY_APP_SECRET`
- `S2BDIY_BASIC_PRODUCT_ID` or `S2BDIY_TEST_BASIC_PRODUCT_ID`
- `S2BDIY_SIZE_ID` or `S2BDIY_TEST_SIZE_ID`
- `S2BDIY_COLOR_ID` or `S2BDIY_TEST_COLOR_ID`
- `S2BDIY_VIEW_ID` or `S2BDIY_TEST_VIEW_ID`
- `S2BDIY_LOGISTICS_ID` or `S2BDIY_TEST_LOGISTICS_ID`

If S2BDIY credentials are missing, real supplier tests are `SKIPPED`, not `FAILED`.

## Pipeline Coverage

The Dev3 pipeline stages are:

1. Preflight: repo root, tools, Medusa CLI, branch, dirty tree warning, conflict marker check.
2. Static checks: TypeScript, backend Jest, dedicated product rating/review Jest, S2BDIY Jest, Dev3 script syntax, Postman JSON.
3. Database setup: Docker services, migrations, seed, `phase1-dev2-bootstrap`.
4. Service health: Medusa and AI Worker.
5. Env/key validation: admin bearer token and publishable API key.
6. Store context and multi-store isolation.
7. Dev1 supplier foundation checks.
8. Product-to-cart bridge checks.
9. Phase 2A AI product E2E.
10. Phase 2B S2BDIY readiness, gated sandbox no-payment flow, gated sandbox payment flow, or credential-dependent skip.
11. Status flow checks.
12. Negative/exception checks.
13. Architecture guard for vendor-specific field leakage.
14. Unified Newman.
15. Final cleanup, diff check, and secret scan.

## Required Behavior

Phase 1:

- `default_store` and `test_store` are seeded.
- `X-Store-Id` resolves current store.
- Storefront product/category APIs require `x-publishable-api-key`.
- Product/category list/detail APIs are scoped to current store.
- Cross-store product detail is blocked.
- Add-to-cart uses native `variant_id = medusa_variant_id`.
- Cross-store variant add returns `CART_STORE_MISMATCH`.

Dev1 supplier foundation:

- `sup_citigoo_mock` supplier exists.
- `sp_tshirt` exists.
- Variants exist for Black/White and S/M/L/XL.
- Front PNG print spec exists.
- T-shirt front design template exists.

Phase 2A:

- AI Worker health passes.
- `POST /admin/ai/generate-and-draft` creates a draft with supplier, mockup, print file, and bridge fields.
- Publish succeeds.
- Store product detail exposes supplier/print/mockup fields.
- Cart add uses `variant_id`.
- Line-item metadata includes supplier and print production fields.
- Cart complete creates a paid order with `pp_system_default`.
- Admin order list can see the order.
- Push fulfillment and mock shipment routes work.

Phase 2B:

- S2BDIY unit tests always run.
- Real S2BDIY sandbox checks run only when `RUN_PHASE2B_S2BDIY` is set to `true` and supplier credentials/config are present.
- Missing supplier credentials are skipped.
- Default real supplier mode stops at product generation and keeps payment skipped.
- Create order requires both `S2BDIY_ALLOW_CREATE_ORDER=true` and `S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE=true`.
- Payment requires `S2BDIY_ALLOW_PAYMENT=true` and `HUMAN_APPROVED_PAYMENT=true` in addition to the create-order gates.
- Tracking may remain blocked after sandbox payment because S2BDIY test orders require manual review.

Product rating/review:

- `npm --workspace apps/medusa-backend run test -- rating` runs as a dedicated Dev3 stage.
- Product review creation is verified for valid ratings, invalid ratings, duplicate rejection, verified order/product matching, and cross-store blocking.

## Supplier-Agnostic Core Schema Rule

Core product/order schemas and generic APIs should use supplier-neutral fields:

- `supplier_id`
- `basic_product_id`
- `supplier_material_id`
- `supplier_product_id`
- `supplier_variant_id`
- `supplier_size_id`
- `supplier_color_id`
- `view_id`
- `design_type`
- `supplier_mockup_image_url`
- `supplier_metadata` or raw supplier response fields where needed

Vendor-specific names such as `s2b_*`, `s2bdiy_*`, `alibaba_*`, or `1688_*` belong only in supplier adapters, supplier-specific scripts, supplier docs, or supplier-specific payload examples.

The Dev3 pipeline includes an architecture guard that fails when vendor-specific fields leak into core models, generic product/cart/order APIs, `docs/api.md`, or `docs/schema.md`.

## Unified Postman / Newman

Canonical collection:

```text
postman/ai-commerce-store-isolation.postman_collection.json
```

Example environment:

```text
postman/ai-commerce-local.example.postman_environment.json
```

Required folders:

- `Phase 1 / Store Isolation Regression`
- `Dev1 / Supplier Foundation`
- `Phase 2A / AI Product E2E`
- `Phase 2B / S2BDIY Supplier Fulfillment`

Phase 1 and Phase 2A run by default. Phase 2B is present in the same collection but skipped by default with:

```text
run_phase2b_s2bdiy=false
```

Set `run_phase2b_s2bdiy=true` only when S2BDIY sandbox credentials and account readiness are configured.

## Manual Newman Command

```bash
npx newman run postman/ai-commerce-store-isolation.postman_collection.json \
  --env-var "base_url=${MEDUSA_BASE_URL:-http://127.0.0.1:9000}" \
  --env-var "ai_worker_base_url=${AI_WORKER_BASE_URL:-http://127.0.0.1:8001}" \
  --env-var "publishable_api_key=$PUBLISHABLE_API_KEY" \
  --env-var "admin_token=$ADMIN_TOKEN" \
  --env-var "default_store_id=default_store" \
  --env-var "test_store_id=test_store" \
  --env-var "default_medusa_product_id=$DEFAULT_MEDUSA_PRODUCT_ID" \
  --env-var "default_medusa_variant_id=$DEFAULT_MEDUSA_VARIANT_ID" \
  --env-var "test_medusa_product_id=$TEST_MEDUSA_PRODUCT_ID" \
  --env-var "test_medusa_variant_id=$TEST_MEDUSA_VARIANT_ID" \
  --env-var "run_phase2b_s2bdiy=${RUN_PHASE2B_S2BDIY:-false}" \
  --env-var "s2bdiy_base_url=${S2BDIY_BASE_URL:-}" \
  --env-var "s2bdiy_app_secret=${S2BDIY_APP_SECRET:-}" \
  --env-var "s2bdiy_basic_product_id=${S2BDIY_BASIC_PRODUCT_ID:-}" \
  --env-var "s2bdiy_size_id=${S2BDIY_SIZE_ID:-}" \
  --env-var "s2bdiy_color_id=${S2BDIY_COLOR_ID:-}" \
  --env-var "s2bdiy_view_id=${S2BDIY_VIEW_ID:-}" \
  --env-var "s2bdiy_logistics_id=${S2BDIY_LOGISTICS_ID:-}"
```

Expected result with `run_phase2b_s2bdiy=false`: Phase 1, Dev1, and Phase 2A pass; Phase 2B logs skipped requests.

## Final PR Checklist

- Worktree contains only intentional docs/test assets.
- `bash -n scripts/dev3-full-backend-pipeline.sh` passes.
- Postman collection and environment JSON validate with `jq empty`.
- No conflict markers.
- No secrets in docs, Postman, or scripts diff.
- Full Dev3 pipeline result is recorded in the PR notes, including any Phase 2B supplier skips.
