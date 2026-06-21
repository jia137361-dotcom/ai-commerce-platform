#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPORT_DIR="${ROOT}/exports"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${EXPORT_DIR}/ai_commerce-${STAMP}.dump"

CONTAINER="${POSTGRES_CONTAINER:-ai-commerce-postgres}"
DB_USER="${POSTGRES_USER:-medusa}"
DB_NAME="${POSTGRES_DB:-ai_commerce}"

mkdir -p "${EXPORT_DIR}"

if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER}"; then
  echo "Postgres container '${CONTAINER}' is not running."
  echo "Start it with: docker compose -f infra/docker-compose.yml up -d postgres"
  exit 1
fi

echo "Exporting ${DB_NAME} from ${CONTAINER} -> ${OUT_FILE}"
docker exec "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc -f "/tmp/ai_commerce.dump"
docker cp "${CONTAINER}:/tmp/ai_commerce.dump" "${OUT_FILE}"
docker exec "${CONTAINER}" rm -f /tmp/ai_commerce.dump

SIZE="$(du -h "${OUT_FILE}" | awk '{print $1}')"
echo ""
echo "Done: ${OUT_FILE} (${SIZE})"
echo "Send this file to your partner via a private channel (not GitHub)."
echo "Also send .env secrets separately — see docs/partner-handoff.md"
