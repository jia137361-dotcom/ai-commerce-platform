#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/partner-import-db.sh exports/ai_commerce-YYYYMMDD-HHMMSS.dump"
  exit 1
fi

DUMP_PATH="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER="${POSTGRES_CONTAINER:-ai-commerce-postgres}"
DB_USER="${POSTGRES_USER:-medusa}"
DB_NAME="${POSTGRES_DB:-ai_commerce}"

if [[ ! -f "${DUMP_PATH}" ]]; then
  echo "Dump file not found: ${DUMP_PATH}"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER}"; then
  echo "Postgres container '${CONTAINER}' is not running."
  echo "Start it with: docker compose -f infra/docker-compose.yml up -d postgres redis"
  exit 1
fi

echo "WARNING: This replaces all data in ${DB_NAME} on ${CONTAINER}."
read -r -p "Continue? [y/N] " confirm
if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

REMOTE="/tmp/ai_commerce_restore.dump"
docker cp "${DUMP_PATH}" "${CONTAINER}:${REMOTE}"

echo "Terminating active connections..."
docker exec "${CONTAINER}" psql -U "${DB_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

echo "Restoring (this may take a minute)..."
docker exec "${CONTAINER}" pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-acl "${REMOTE}" || {
  echo "Note: pg_restore may print harmless warnings about missing objects on first import."
}

docker exec "${CONTAINER}" rm -f "${REMOTE}"

echo ""
echo "Import complete."
echo "Next steps:"
echo "  1. Copy apps/medusa-backend/.env from your partner (secrets via private message)"
echo "  2. cp apps/storefront/.env.example apps/storefront/.env.local  # set VITE_PUBLISHABLE_API_KEY"
echo "  3. npm run dev:all"
echo "  4. Login at http://127.0.0.1:5173/login with credentials from your partner"
