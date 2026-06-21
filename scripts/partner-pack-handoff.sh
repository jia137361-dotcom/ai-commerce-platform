#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
PACK_DIR="${ROOT}/exports/handoff-${STAMP}"

bash "${ROOT}/scripts/partner-export-db.sh"

LATEST_DUMP="$(ls -t "${ROOT}"/exports/ai_commerce-*.dump 2>/dev/null | head -1)"
if [[ -z "${LATEST_DUMP}" ]]; then
  echo "No dump file found after export."
  exit 1
fi

mkdir -p "${PACK_DIR}"
cp "${LATEST_DUMP}" "${PACK_DIR}/"

cat > "${PACK_DIR}/README-FOR-PARTNER.txt" <<EOF
AI Commerce Platform — 本地交接包 (${STAMP})

1. git clone <repo-url> && git checkout <branch>
2. npm install
3. docker compose -f infra/docker-compose.yml up -d postgres redis
4. bash scripts/partner-import-db.sh $(basename "${LATEST_DUMP}")
   (先把 $(basename "${LATEST_DUMP}") 放到项目的 exports/ 目录)
5. 向项目负责人索取 .env 私密配置（JWT_SECRET、PUBLISHABLE_API_KEY、登录密码）
6. npm run dev:all

详细说明: docs/partner-handoff.md
EOF

echo ""
echo "Handoff pack ready: ${PACK_DIR}"
echo "Contents:"
ls -lh "${PACK_DIR}"
