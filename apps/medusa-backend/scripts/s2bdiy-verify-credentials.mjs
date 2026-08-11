#!/usr/bin/env node
/**
 * Verify S2BDIY opentest credentials from apps/medusa-backend/.env
 * Usage: node apps/medusa-backend/scripts/s2bdiy-verify-credentials.mjs
 */
import { config } from "dotenv"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
config({ path: resolve(root, ".env") })

const base = (process.env.S2BDIY_API_BASE_URL || process.env.S2BDIY_BASE_URL || "").replace(/\/$/, "")
const appKey = process.env.S2BDIY_APP_KEY
const appSecret = process.env.S2BDIY_APP_SECRET
const mockMode = process.env.S2BDIY_MOCK_MODE === "true"

if (!base || !appKey || !appSecret) {
  console.error("Missing S2BDIY_API_BASE_URL, S2BDIY_APP_KEY, or S2BDIY_APP_SECRET in .env")
  process.exit(1)
}

if (mockMode) {
  console.log("S2BDIY_MOCK_MODE=true — skipping real token check (local mock only).")
  console.log("Set S2BDIY_MOCK_MODE=false after updating AppSecret for real SDK/editor.")
  process.exit(0)
}

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

if (token) {
  console.log("OK — S2BDIY accessToken obtained.")
  console.log(`  api: ${base}`)
  console.log(`  app_key: ${appKey}`)
  console.log(`  token_prefix: ${token.slice(0, 8)}…`)
  process.exit(0)
}

console.error("FAIL — could not obtain S2BDIY accessToken.")
console.error(`  status_code: ${body?.status_code ?? res.status}`)
console.error(`  msg: ${body?.msg ?? JSON.stringify(body)}`)
console.error("")
console.error("Fix: update S2BDIY_APP_KEY / S2BDIY_APP_SECRET in apps/medusa-backend/.env")
console.error("Then set S2BDIY_MOCK_MODE=false and restart npm run dev:full")
process.exit(1)
