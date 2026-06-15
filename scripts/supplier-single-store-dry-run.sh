#!/usr/bin/env bash
# Single-store S2BDIY dry-run wrapper.
# Default max phase is 0, which performs only local env/safety checks and never calls supplier APIs.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

load_env_file "apps/medusa-backend/.env"
load_env_file "scripts/supplier-single-store-dry-run.local.env"

S2BDIY_BASE_URL="${S2BDIY_BASE_URL:-${S2BDIY_API_BASE_URL:-}}"
S2BDIY_APP_KEY="${S2BDIY_APP_KEY:-}"
S2BDIY_APP_SECRET="${S2BDIY_APP_SECRET:-}"
S2BDIY_TEST_MODE="${S2BDIY_TEST_MODE:-false}"
SUPPLIER_ALLOW_PAYMENT="${SUPPLIER_ALLOW_PAYMENT:-false}"
S2BDIY_ALLOW_PAYMENT="${S2BDIY_ALLOW_PAYMENT:-$SUPPLIER_ALLOW_PAYMENT}"
HUMAN_APPROVED_PAYMENT="${HUMAN_APPROVED_PAYMENT:-false}"
S2BDIY_DRY_RUN_MAX_PHASE="${S2BDIY_DRY_RUN_MAX_PHASE:-0}"
S2BDIY_ALLOW_CREATE_ORDER="${S2BDIY_ALLOW_CREATE_ORDER:-false}"
S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE="${S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE:-false}"

RUN_ID="$(date +%Y%m%d-%H%M%S)"
SUPPLIER_LOG_DIR="${SUPPLIER_LOG_DIR:-logs/supplier-single-store-$RUN_ID}"
mkdir -p "$SUPPLIER_LOG_DIR"/{raw,masked,assets,commands}

mask_value() {
  local value="${1:-}"
  local len=${#value}
  if [[ -z "$value" ]]; then
    printf "missing"
  elif (( len <= 6 )); then
    printf "%s***%s" "${value:0:1}" "${value: -1}"
  else
    printf "%s***%s" "${value:0:3}" "${value: -3}"
  fi
}

classify_env() {
  local base="$1"
  if [[ "$base" == *"opentest.s2bdiy.com"* ]]; then
    printf "sandbox/test likely"
  elif [[ "$base" == *"openapi.s2bdiy.com"* ]]; then
    printf "production likely"
  elif [[ -z "$base" ]]; then
    printf "missing"
  else
    printf "unknown"
  fi
}

write_phase0_report() {
  local result="$1"
  local notes="$2"
  local branch commit env_kind missing_core mutation_allowed
  branch="$(git branch --show-current 2>/dev/null || printf "unknown")"
  commit="$(git rev-parse --short HEAD 2>/dev/null || printf "unknown")"
  env_kind="$(classify_env "$S2BDIY_BASE_URL")"
  missing_core=()
  [[ -z "$S2BDIY_BASE_URL" ]] && missing_core+=("S2BDIY_BASE_URL")
  [[ -z "$S2BDIY_APP_KEY" ]] && missing_core+=("S2BDIY_APP_KEY")
  [[ -z "$S2BDIY_APP_SECRET" ]] && missing_core+=("S2BDIY_APP_SECRET")
  mutation_allowed="false"
  [[ "$S2BDIY_TEST_MODE" == "true" ]] && [[ "$env_kind" == "sandbox/test likely" ]] && mutation_allowed="true"

  cat > "$SUPPLIER_LOG_DIR/REPORT.md" <<EOF
# Single-store S2BDIY Supplier Dry-run Report

## 1. Environment

- branch: $branch
- commit: $commit
- run_id: $RUN_ID
- log_dir: $SUPPLIER_LOG_DIR
- base_url_masked: $(mask_value "$S2BDIY_BASE_URL")
- environment_classification: $env_kind
- app_key_masked: $(mask_value "$S2BDIY_APP_KEY")
- app_secret: $([[ -n "$S2BDIY_APP_SECRET" ]] && printf "exists" || printf "missing")
- S2BDIY_TEST_MODE: $S2BDIY_TEST_MODE
- SUPPLIER_ALLOW_PAYMENT: $SUPPLIER_ALLOW_PAYMENT
- S2BDIY_ALLOW_PAYMENT: $S2BDIY_ALLOW_PAYMENT
- HUMAN_APPROVED_PAYMENT: $HUMAN_APPROVED_PAYMENT
- S2BDIY_DRY_RUN_MAX_PHASE: $S2BDIY_DRY_RUN_MAX_PHASE
- S2BDIY_ALLOW_CREATE_ORDER: $S2BDIY_ALLOW_CREATE_ORDER
- S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE: $S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE

## 2. Safety Gates

- missing_core_credentials: ${missing_core[*]:-none}
- supplier_mutations_allowed: $mutation_allowed
- create_order_allowed: $S2BDIY_ALLOW_CREATE_ORDER
- payment_allowed: $([[ "$S2BDIY_ALLOW_PAYMENT" == "true" && "$HUMAN_APPROVED_PAYMENT" == "true" ]] && printf "true" || printf "false")
- orderPay_allowed_only_when: S2BDIY_DRY_RUN_MAX_PHASE=3, S2BDIY_ALLOW_PAYMENT=true, HUMAN_APPROVED_PAYMENT=true
- never_call: POST /open/v1/order/{id}/logistics, POST /open/v1/childUser, POST /open/v1/store, POST /open/v1/product/{id}/copy, DELETE /open/v1/order/{id}

## 3. Overall Result

| Phase | Result | Notes |
|---|---|---|
| Phase 0 Env Check | $result | $notes |
| Phase 1 Product Generation | SKIPPED | S2BDIY_DRY_RUN_MAX_PHASE=$S2BDIY_DRY_RUN_MAX_PHASE |
| Phase 2 Unpaid Order Pricing | SKIPPED | Requires S2BDIY_DRY_RUN_MAX_PHASE >= 2 and S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE=true |
| Phase 3 Payment | SKIPPED | PAYMENT_SKIPPED_BY_DEFAULT unless Phase 3 payment gates are explicitly enabled |

## 4. Selected Basic Product

SKIPPED

## 5. Selected Variant / View

SKIPPED

## 6. Material Upload

SKIPPED

## 7. Generated Supplier Product

SKIPPED

## 8. Logistics Quote

SKIPPED

## 9. Unpaid Order and Pricing

- supplier_order_id: SKIPPED
- external_order_id: SKIPPED
- product_amount: SKIPPED
- shipping_amount: SKIPPED
- discount_amount: SKIPPED
- total_amount: SKIPPED
- currency: TODO_CONFIRM_WITH_SUPPLIER
- payment_status: PAYMENT_SKIPPED_BY_DEFAULT

## 10. Blockers

$(if ((${#missing_core[@]} > 0)); then printf -- "- Missing core credentials: %s\n" "${missing_core[*]}"; fi)
$(if [[ "$S2BDIY_TEST_MODE" != "true" ]]; then printf -- "- S2BDIY_TEST_MODE is not true; supplier mutations are disabled.\n"; fi)
$(if [[ "$env_kind" != "sandbox/test likely" ]]; then printf -- "- Environment is %s; stop before supplier mutation.\n" "$env_kind"; fi)

## 11. Raw Response Files

No supplier API was called in Phase 0.

Expected paths for later phases:

- raw/access-token.json
- raw/basic-product-categorys.json
- raw/basic-products.json
- raw/basic-product-detail.json
- raw/upload-material.json
- raw/material-detail.json
- raw/create-product.json
- raw/product-detail.json
- raw/products.json
- raw/shops.json
- raw/logistics-calculation.json
- raw/calculate-products.json
- raw/create-order.json
- raw/order-detail.json
- raw/orders.json

## 12. Next Actions

- Set S2BDIY_BASE_URL, S2BDIY_APP_KEY, and S2BDIY_APP_SECRET locally.
- Set S2BDIY_TEST_MODE=true only for confirmed test/sandbox credentials.
- Run Phase 1 with S2BDIY_DRY_RUN_MAX_PHASE=1.
- Run Phase 2 only after confirming Create Order does not charge: S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE=true S2BDIY_DRY_RUN_MAX_PHASE=2.
- This script calls POST /open/v1/orderPay only when S2BDIY_DRY_RUN_MAX_PHASE=3, S2BDIY_ALLOW_PAYMENT=true, and HUMAN_APPROVED_PAYMENT=true.
EOF
}

missing=0
[[ -z "$S2BDIY_BASE_URL" ]] && missing=1
[[ -z "$S2BDIY_APP_KEY" ]] && missing=1
[[ -z "$S2BDIY_APP_SECRET" ]] && missing=1

if ! [[ "$S2BDIY_DRY_RUN_MAX_PHASE" =~ ^[0-3]$ ]]; then
  write_phase0_report "BLOCKED" "Invalid S2BDIY_DRY_RUN_MAX_PHASE=$S2BDIY_DRY_RUN_MAX_PHASE"
  echo "REPORT: $SUPPLIER_LOG_DIR/REPORT.md"
  exit 2
fi

if [[ "$S2BDIY_DRY_RUN_MAX_PHASE" == "0" ]]; then
  if [[ "$missing" == "1" ]]; then
    write_phase0_report "BLOCKED" "Missing core credentials; no supplier API called."
    echo "REPORT: $SUPPLIER_LOG_DIR/REPORT.md"
    exit 2
  fi
  write_phase0_report "PASS" "Phase 0 only; no supplier API called."
  echo "REPORT: $SUPPLIER_LOG_DIR/REPORT.md"
  exit 0
fi

if [[ "$missing" == "1" ]]; then
  write_phase0_report "BLOCKED" "Missing core credentials; no supplier API called."
  echo "REPORT: $SUPPLIER_LOG_DIR/REPORT.md"
  exit 2
fi

if [[ "$S2BDIY_TEST_MODE" != "true" ]]; then
  write_phase0_report "BLOCKED" "S2BDIY_TEST_MODE is not true; supplier mutations are disabled."
  echo "REPORT: $SUPPLIER_LOG_DIR/REPORT.md"
  exit 2
fi

export S2BDIY_BASE_URL S2BDIY_API_BASE_URL="$S2BDIY_BASE_URL"
export S2BDIY_APP_KEY S2BDIY_APP_SECRET S2BDIY_TEST_MODE
export SUPPLIER_ALLOW_PAYMENT S2BDIY_ALLOW_PAYMENT HUMAN_APPROVED_PAYMENT
export S2BDIY_DRY_RUN_MAX_PHASE S2BDIY_ALLOW_CREATE_ORDER S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE
export SUPPLIER_LOG_DIR RUN_ID

if [[ ! -x "apps/medusa-backend/node_modules/.bin/medusa" && ! -x "node_modules/.bin/medusa" ]]; then
  write_phase0_report "BLOCKED" "Node dependencies are missing; install dependencies before running Phase $S2BDIY_DRY_RUN_MAX_PHASE."
  echo "REPORT: $SUPPLIER_LOG_DIR/REPORT.md"
  exit 2
fi

(
  cd apps/medusa-backend
  npx medusa exec ./src/scripts/s2bdiy-single-store-dry-run.ts
)
