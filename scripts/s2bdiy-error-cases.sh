#!/usr/bin/env bash
# S2BDIY 异常场景：重复 third_order_id、无效 token
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/medusa-backend/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

BASE="${S2BDIY_API_BASE_URL:-https://opentest.s2bdiy.com}"
BASE="${BASE%/}"
APP_KEY="${S2BDIY_APP_KEY:-wm001}"
APP_SECRET="${S2BDIY_APP_SECRET:-}"

echo "== duplicate third_order_id (expect error) =="
TOKEN=$(curl -sS -X POST "$BASE/open/v1/accessToken" \
  -H "Content-Type: application/json" \
  -d "{\"app_key\":\"$APP_KEY\",\"app_secret\":\"$APP_SECRET\"}" | jq -r '.data.token // .token')

THIRD="dup-test-fixed-id"
# 仅演示：第二次相同 third_order_id 应失败（需先有成功订单 payload，此处打印说明）
echo "Use same third_order_id=$THIRD twice on POST /open/v1/order — expect 订单号重复"

echo "== invalid token (expect 401) =="
CODE=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer invalid" "$BASE/open/v1/basicProduct?page=1")
echo "HTTP $CODE (expected 401)"
