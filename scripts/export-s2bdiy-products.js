#!/usr/bin/env node
/**
 * Export S2BDIY basic products to JSON for scripts/update-ship-from-area.js
 *
 * Usage:
 *   node scripts/export-s2bdiy-products.js
 *   node scripts/export-s2bdiy-products.js --out ./exports/s2bdiy-products.json
 *
 * Requires in apps/medusa-backend/.env:
 *   S2BDIY_API_BASE_URL (or S2BDIY_BASE_URL)
 *   S2BDIY_APP_KEY
 *   S2BDIY_APP_SECRET
 *   S2BDIY_MOCK_MODE=false
 */

const fs = require("fs")
const path = require("path")
const { REPO_ROOT, readEnvValue } = require("./lib/pg-client")

const ENV_FILE = path.join(REPO_ROOT, "apps/medusa-backend/.env")

function readS2bEnv(key) {
  return readEnvValue(key, ENV_FILE) || process.env[key] || null
}

function parseArgs(argv) {
  const args = { out: path.join(REPO_ROOT, "exports/s2bdiy-products.json"), perPage: 100 }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) {
      args.out = path.isAbsolute(argv[i + 1])
        ? argv[i + 1]
        : path.join(REPO_ROOT, argv[i + 1])
      i++
    } else if (argv[i] === "--per-page" && argv[i + 1]) {
      args.perPage = Number(argv[i + 1]) || 100
      i++
    }
  }
  return args
}

async function fetchAccessToken(base, appKey, appSecret) {
  const res = await fetch(`${base}/open/v1/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
  })
  const body = await res.json().catch(() => ({}))
  const token =
    (typeof body?.data?.token === "string" && body.data.token) ||
    (typeof body?.token === "string" && body.token) ||
    null
  if (!token) {
    throw new Error(
      `S2BDIY accessToken failed (${body?.status_code ?? res.status}): ${body?.msg ?? JSON.stringify(body)}`
    )
  }
  return token
}

async function fetchBasicProductPage(base, token, page, perPage) {
  const url = new URL(`${base}/open/v1/basicProduct`)
  url.searchParams.set("page", String(page))
  url.searchParams.set("per_page", String(perPage))

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`basicProduct page ${page} failed: HTTP ${res.status}`)
  }

  const data = body?.data
  const rows = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(body?.data)
      ? body.data
      : []

  const lastPage =
    typeof data?.last_page === "number"
      ? data.last_page
      : typeof data?.total === "number" && perPage > 0
        ? Math.max(1, Math.ceil(data.total / perPage))
        : page

  return { rows, lastPage, total: data?.total ?? rows.length }
}

function normalizeRow(row) {
  return {
    id: row.id,
    code: row.code ?? null,
    name: row.name ?? null,
    produce_area_text: row.produce_area_text ?? row.produce_country_text ?? null,
    produce_country: row.produce_country ?? null,
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const base = (readS2bEnv("S2BDIY_API_BASE_URL") || readS2bEnv("S2BDIY_BASE_URL") || "")
    .replace(/\/+$/, "")
  const appKey = readS2bEnv("S2BDIY_APP_KEY")
  const appSecret = readS2bEnv("S2BDIY_APP_SECRET")
  const mockMode = readS2bEnv("S2BDIY_MOCK_MODE") === "true"

  if (!base || !appKey || !appSecret) {
    throw new Error(
      "Missing S2BDIY_API_BASE_URL / S2BDIY_APP_KEY / S2BDIY_APP_SECRET in apps/medusa-backend/.env"
    )
  }
  if (mockMode) {
    throw new Error("S2BDIY_MOCK_MODE=true — set false and configure real credentials before export.")
  }

  console.log(`Fetching S2BDIY basic products from ${base} ...`)
  const token = await fetchAccessToken(base, appKey, appSecret)

  const all = []
  let page = 1
  let lastPage = 1

  do {
    const result = await fetchBasicProductPage(base, token, page, args.perPage)
    lastPage = result.lastPage
    for (const row of result.rows) {
      if (row && typeof row.id !== "undefined") {
        all.push(normalizeRow(row))
      }
    }
    console.log(`  page ${page}/${lastPage}: +${result.rows.length} (total ${all.length})`)
    page++
  } while (page <= lastPage)

  fs.mkdirSync(path.dirname(args.out), { recursive: true })
  fs.writeFileSync(args.out, JSON.stringify(all, null, 2), "utf8")
  console.log(`\nWrote ${all.length} products → ${args.out}`)
  console.log("\nNext:")
  console.log(`  S2BDIY_PRODUCTS_JSON=${args.out} node scripts/update-ship-from-area.js`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
