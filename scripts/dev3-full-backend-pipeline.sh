#!/usr/bin/env bash
# Canonical Dev3 backend integration pipeline for Phase 1, Phase 2A, and Phase 2B.
# Run from repo root:
#   bash scripts/dev3-full-backend-pipeline.sh
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/medusa-backend/.env"

cd "$REPO_ROOT"

declare -a SUMMARY_ROWS=()
PIPELINE_FAILED=0

stage() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

record() {
  local name="$1"
  local status="$2"
  local notes="${3:-}"
  SUMMARY_ROWS+=("$name|$status|$notes")
}

print_summary() {
  echo
  echo "| Stage | Status | Notes |"
  echo "| --- | --- | --- |"
  for row in "${SUMMARY_ROWS[@]}"; do
    IFS="|" read -r name status notes <<<"$row"
    echo "| $name | $status | $notes |"
  done
}

fail_now() {
  local message="$1"
  echo "ERROR: $message" >&2
  PIPELINE_FAILED=1
  print_summary
  exit 1
}

require_tool() {
  local tool="$1"
  command -v "$tool" >/dev/null 2>&1 || fail_now "$tool is required"
}

run_required() {
  local name="$1"
  shift
  echo "==> $name"
  if "$@"; then
    record "$name" "PASS" ""
  else
    record "$name" "FAIL" "required command failed"
    fail_now "$name failed"
  fi
}

run_optional_supplier() {
  local name="$1"
  shift
  local tmp
  tmp="$(mktemp)"
  echo "==> $name"
  if "$@" >"$tmp" 2>&1; then
    cat "$tmp"
    rm -f "$tmp"
    record "$name" "PASS" ""
    return 0
  fi

  cat "$tmp"
  if grep -Eqi "Could not resolve|Failed to connect|Connection refused|timed out|timeout|ENOTFOUND|ECONNREFUSED" "$tmp"; then
    record "$name" "BLOCKED" "supplier network unavailable"
  else
    record "$name" "FAIL" "supplier command failed"
    PIPELINE_FAILED=1
  fi
  rm -f "$tmp"
}

json_get() {
  jq -r "$1 // empty"
}

has_s2bdiy_credentials() {
  [[ -n "${S2BDIY_APP_SECRET:-}" ]]
}

secret_diff_check() {
  local tmp
  tmp="$(mktemp)"
  git diff --name-only -- postman docs scripts >"$tmp"
  if git diff -- postman docs scripts | grep -Eq "pk_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}|sk_[A-Za-z0-9]|FAL_KEY=.*[A-Za-z0-9]{10,}|DEEPSEEK_API_KEY=.*[A-Za-z0-9]{10,}|STRIPE_API_KEY=.*[A-Za-z0-9]{10,}|S2BDIY.*=.*[A-Za-z0-9]{10,}"; then
    echo "Potential secret found in changed docs/postman/scripts files. Review these paths:"
    cat "$tmp"
    rm -f "$tmp"
    return 1
  fi
  rm -f "$tmp"
}

trap 'echo "Pipeline failed near line $LINENO"; print_summary' ERR

stage "Stage 0: Preflight / dependency / safety checks"

[[ "$PWD" == "$REPO_ROOT" ]] || fail_now "script must run from repo root"

for tool in node npm jq curl docker npx git; do
  require_tool "$tool"
done

if [[ -x node_modules/.bin/medusa ]]; then
  record "Medusa CLI" "PASS" "node_modules/.bin/medusa"
else
  record "Medusa CLI" "FAIL" "run npm install --include=dev"
  fail_now "Medusa CLI missing"
fi

if grep -n "<<<<<<<\|=======\|>>>>>>>" docs/testing.md docs/api.md docs/schema.md docs/suppliers/s2bdiy.md; then
  record "conflict markers" "FAIL" "docs contain merge markers"
  fail_now "conflict markers found"
else
  record "conflict markers" "PASS" ""
fi

if [[ -n "$(git status --short)" ]]; then
  echo "WARN: working tree is dirty; pipeline will not clean or restore files."
  git status --short
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BASE_URL="${MEDUSA_BASE_URL:-http://127.0.0.1:9000}"
AI_WORKER_BASE_URL="${AI_WORKER_BASE_URL:-http://127.0.0.1:8001}"
PUBLISHABLE_API_KEY="${PUBLISHABLE_API_KEY:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
export BASE_URL AI_WORKER_BASE_URL PUBLISHABLE_API_KEY ADMIN_TOKEN

[[ -n "$PUBLISHABLE_API_KEY" ]] || fail_now "PUBLISHABLE_API_KEY is required for Phase 1/2A"
[[ -n "$ADMIN_TOKEN" ]] || fail_now "ADMIN_TOKEN is required for Phase 1/2A"

echo "ADMIN_TOKEN length: ${#ADMIN_TOKEN}"
echo "PUBLISHABLE_API_KEY prefix: ${PUBLISHABLE_API_KEY:0:8}..."

stage "Stage 1: Static checks and unit tests"

run_required "tsc" npx tsc --noEmit -p apps/medusa-backend/tsconfig.json
run_required "backend Jest" npm test --workspace apps/medusa-backend
run_required "S2BDIY Jest" npm test --workspace apps/medusa-backend -- s2bdiy

for script in \
  scripts/phase1-dev2-self-test.sh \
  scripts/phase2a-dev2-e2e.sh \
  scripts/smoke-store-isolation.sh \
  scripts/phase2b-e2e.sh \
  scripts/s2bdiy-api-smoke.sh \
  scripts/s2bdiy-error-cases.sh; do
  run_required "bash -n $script" bash -n "$script"
done
record "shell syntax" "PASS" "all listed scripts"

run_required "Postman JSON" jq empty postman/ai-commerce-store-isolation.postman_collection.json
run_required "Postman env JSON" jq empty postman/ai-commerce-local.example.postman_environment.json

if [[ -d apps/ai-worker ]] && command -v python >/dev/null 2>&1; then
  if (cd apps/ai-worker && python - <<'PY'
import importlib.util
raise SystemExit(0 if importlib.util.find_spec("pytest") else 1)
PY
  ); then
    if (cd apps/ai-worker && AI_WORKER_MOCK_GENERATION=true python -m pytest -q); then
      record "AI Worker pytest" "PASS" ""
    else
      record "AI Worker pytest" "FAIL" "pytest failed"
      fail_now "AI Worker pytest failed"
    fi
  else
    record "AI Worker pytest" "SKIPPED" "pytest not installed in active Python"
  fi
else
  record "AI Worker pytest" "SKIPPED" "apps/ai-worker or python unavailable"
fi

stage "Stage 2: Database migration, seed, and bootstrap"

run_required "docker compose up" docker compose -f infra/docker-compose.yml up -d
run_required "docker compose ps" docker compose -f infra/docker-compose.yml ps
run_required "db:migrate" npm --workspace apps/medusa-backend run db:migrate
run_required "seed" npm run seed
run_required "phase1 bootstrap" bash -lc "cd apps/medusa-backend && npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts"

stage "Stage 3: Service health and local env verification"

if curl -sf "$BASE_URL/health" >/dev/null; then
  record "Medusa health" "PASS" "$BASE_URL"
else
  record "Medusa health" "FAIL" "$BASE_URL"
  fail_now "Medusa backend is not healthy"
fi

AI_WORKER_HEALTHY=0
if curl -sf "$AI_WORKER_BASE_URL/health" >/dev/null; then
  AI_WORKER_HEALTHY=1
  record "AI Worker health" "PASS" "$AI_WORKER_BASE_URL"
else
  record "AI Worker health" "BLOCKED" "start: cd apps/ai-worker && AI_WORKER_MOCK_GENERATION=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8001"
  if [[ "${DEV3_ALLOW_BLOCKED_AI_WORKER:-false}" != "true" ]]; then
    fail_now "AI Worker is required for Phase 2A. Set DEV3_ALLOW_BLOCKED_AI_WORKER=true to continue with AI-dependent checks blocked."
  fi
fi

echo "Extracting bridge ids from prod_phase1_default / prod_phase1_test"
DEFAULT_PRODUCT_JSON="$(curl -sS "$BASE_URL/store/products" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store" | jq -c '.products[]? | select(.product_id == "prod_phase1_default")')"
TEST_PRODUCT_JSON="$(curl -sS "$BASE_URL/store/products" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: test_store" | jq -c '.products[]? | select(.product_id == "prod_phase1_test")')"

export DEFAULT_MEDUSA_PRODUCT_ID
export DEFAULT_MEDUSA_VARIANT_ID
export TEST_MEDUSA_PRODUCT_ID
export TEST_MEDUSA_VARIANT_ID
if [[ -z "$DEFAULT_PRODUCT_JSON" || -z "$TEST_PRODUCT_JSON" ]]; then
  record "bridge ids" "FAIL" "bootstrap products not found in Store API"
  fail_now "bootstrap products not found"
fi

DEFAULT_MEDUSA_PRODUCT_ID="$(jq -r '.medusa_product_id // empty' <<<"$DEFAULT_PRODUCT_JSON")"
DEFAULT_MEDUSA_VARIANT_ID="$(jq -r '.medusa_variant_id // empty' <<<"$DEFAULT_PRODUCT_JSON")"
TEST_MEDUSA_PRODUCT_ID="$(jq -r '.medusa_product_id // empty' <<<"$TEST_PRODUCT_JSON")"
TEST_MEDUSA_VARIANT_ID="$(jq -r '.medusa_variant_id // empty' <<<"$TEST_PRODUCT_JSON")"

if [[ -z "$DEFAULT_MEDUSA_PRODUCT_ID" || -z "$DEFAULT_MEDUSA_VARIANT_ID" || -z "$TEST_MEDUSA_PRODUCT_ID" || -z "$TEST_MEDUSA_VARIANT_ID" ]]; then
  record "bridge ids" "FAIL" "missing prod_phase1_default/prod_phase1_test bridge ids"
  fail_now "bridge id extraction failed"
fi
record "bridge ids" "PASS" "extracted from bootstrap products"

stage "Stage 4: Dev1 supplier foundation checks"

ADMIN_SUPPLIERS="$(curl -sS "$BASE_URL/admin/supplier-products" -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: default_store")"
STORE_SUPPLIERS="$(curl -sS "$BASE_URL/store/supplier-products" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store")"

echo "$ADMIN_SUPPLIERS" | jq -e '.supplier_products | type == "array" and length > 0' >/dev/null
echo "$STORE_SUPPLIERS" | jq -e '.supplier_products | type == "array" and length > 0' >/dev/null
echo "$ADMIN_SUPPLIERS" | jq -e '.supplier_products[] | select(.supplier_product_id == "sp_tshirt" and .supplier_id == "sup_citigoo_mock")' >/dev/null

for variant in \
  spv_tshirt_black_s \
  spv_tshirt_black_m \
  spv_tshirt_black_l \
  spv_tshirt_black_xl \
  spv_tshirt_white_s \
  spv_tshirt_white_m \
  spv_tshirt_white_l \
  spv_tshirt_white_xl; do
  echo "$ADMIN_SUPPLIERS" | jq -e --arg variant "$variant" '.supplier_products[].variants[]? | select(.supplier_variant_id == $variant)' >/dev/null
done

echo "$ADMIN_SUPPLIERS" | jq -e '.supplier_products[].print_specs[]? | select(.print_spec_id == "sps_tshirt_front_png")' >/dev/null
echo "$ADMIN_SUPPLIERS" | jq -e '.supplier_products[].design_templates[]? | select(.template_id == "pdt_tshirt_front")' >/dev/null
record "Dev1 supplier foundation" "PASS" "mock supplier, T-shirt variants, print spec, design template"

stage "Stage 5: Phase 1 regression"

run_required "Phase 1 self-test" bash scripts/phase1-dev2-self-test.sh

stage "Stage 6: Phase 2A E2E"

if [[ "$AI_WORKER_HEALTHY" == "1" ]]; then
  run_required "Phase 2A E2E" bash -lc "PHASE2A_E2E_COMPLETE=true bash scripts/phase2a-dev2-e2e.sh"
else
  record "Phase 2A E2E" "BLOCKED" "AI Worker unavailable"
fi

stage "Stage 7: Dev3 smoke / Newman"

run_required "smoke-store-isolation" bash -lc 'PUBLISHABLE_API_KEY="$PUBLISHABLE_API_KEY" ADMIN_TOKEN="$ADMIN_TOKEN" DEFAULT_MEDUSA_PRODUCT_ID="$DEFAULT_MEDUSA_PRODUCT_ID" DEFAULT_MEDUSA_VARIANT_ID="$DEFAULT_MEDUSA_VARIANT_ID" TEST_MEDUSA_PRODUCT_ID="$TEST_MEDUSA_PRODUCT_ID" TEST_MEDUSA_VARIANT_ID="$TEST_MEDUSA_VARIANT_ID" bash scripts/smoke-store-isolation.sh'

RUN_PHASE2B_S2BDIY=false
if has_s2bdiy_credentials; then
  RUN_PHASE2B_S2BDIY=true
fi

run_required "Unified Newman" npx newman run postman/ai-commerce-store-isolation.postman_collection.json \
  --env-var "base_url=$BASE_URL" \
  --env-var "ai_worker_base_url=$AI_WORKER_BASE_URL" \
  --env-var "publishable_api_key=$PUBLISHABLE_API_KEY" \
  --env-var "admin_token=$ADMIN_TOKEN" \
  --env-var "default_store_id=default_store" \
  --env-var "test_store_id=test_store" \
  --env-var "default_medusa_product_id=$DEFAULT_MEDUSA_PRODUCT_ID" \
  --env-var "default_medusa_variant_id=$DEFAULT_MEDUSA_VARIANT_ID" \
  --env-var "test_medusa_product_id=$TEST_MEDUSA_PRODUCT_ID" \
  --env-var "test_medusa_variant_id=$TEST_MEDUSA_VARIANT_ID" \
  --env-var "run_phase2b_s2bdiy=$RUN_PHASE2B_S2BDIY" \
  --env-var "s2bdiy_base_url=${S2BDIY_API_BASE_URL:-${S2BDIY_BASE_URL:-}}" \
  --env-var "s2bdiy_client_id=${S2BDIY_APP_KEY:-${S2BDIY_CLIENT_ID:-}}" \
  --env-var "s2bdiy_client_secret=${S2BDIY_APP_SECRET:-${S2BDIY_CLIENT_SECRET:-}}" \
  --env-var "s2bdiy_app_secret=${S2BDIY_APP_SECRET:-}" \
  --env-var "s2bdiy_basic_product_id=${S2BDIY_TEST_BASIC_PRODUCT_ID:-${S2BDIY_BASIC_PRODUCT_ID:-}}" \
  --env-var "s2bdiy_size_id=${S2BDIY_TEST_SIZE_ID:-${S2BDIY_SIZE_ID:-}}" \
  --env-var "s2bdiy_color_id=${S2BDIY_TEST_COLOR_ID:-${S2BDIY_COLOR_ID:-}}" \
  --env-var "s2bdiy_view_id=${S2BDIY_TEST_VIEW_ID:-${S2BDIY_VIEW_ID:-}}" \
  --env-var "s2bdiy_logistics_id=${S2BDIY_TEST_LOGISTICS_ID:-${S2BDIY_LOGISTICS_ID:-}}"

stage "Stage 8: Phase 2B S2BDIY supplier fulfillment"

if has_s2bdiy_credentials; then
  run_optional_supplier "S2BDIY API smoke" bash scripts/s2bdiy-api-smoke.sh
  run_optional_supplier "S2BDIY error cases" bash scripts/s2bdiy-error-cases.sh
  run_optional_supplier "Phase 2B E2E" bash scripts/phase2b-e2e.sh
else
  record "S2BDIY API smoke" "SKIPPED" "S2BDIY_APP_SECRET missing"
  record "S2BDIY error cases" "SKIPPED" "S2BDIY_APP_SECRET missing"
  record "Phase 2B E2E" "SKIPPED" "S2BDIY_APP_SECRET missing"
fi

stage "Stage 9: Final cleanup and report"

run_required "git diff --check" git diff --check
if secret_diff_check; then
  record "secret scan" "PASS" ""
else
  record "secret scan" "FAIL" "potential secret in diff"
  fail_now "secret scan failed"
fi

echo "Current working tree:"
git status --short

if [[ "$PIPELINE_FAILED" == "0" ]]; then
  record "overall" "PASS" "required checks passed"
else
  record "overall" "FAIL" "one or more checks failed"
fi

print_summary

if [[ "$PIPELINE_FAILED" != "0" ]]; then
  exit 1
fi
