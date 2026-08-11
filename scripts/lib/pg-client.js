/**
 * Shared Postgres client for one-off maintenance scripts.
 * Uses DATABASE_URL from the environment, or reads it from apps/medusa-backend/.env.
 *
 * Never hardcode production credentials in repo scripts.
 */

const fs = require("fs")
const path = require("path")
const { Client } = require("pg")

const REPO_ROOT = path.join(__dirname, "../..")
const DEFAULT_ENV_FILE = path.join(REPO_ROOT, "apps/medusa-backend/.env")

function stripQuotes(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function readEnvValue(key, envFile = DEFAULT_ENV_FILE) {
  if (process.env[key]) return process.env[key]
  if (!fs.existsSync(envFile)) return null

  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const name = trimmed.slice(0, eq).trim()
    if (name !== key) continue
    return stripQuotes(trimmed.slice(eq + 1))
  }
  return null
}

function resolveDatabaseUrl() {
  const url = readEnvValue("DATABASE_URL")
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Export it or set it in apps/medusa-backend/.env"
    )
  }
  return url
}

async function withPgClient(run, options = {}) {
  const client = new Client({
    connectionString: resolveDatabaseUrl(),
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 30000,
    ssl: options.ssl,
  })

  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

module.exports = {
  Client,
  REPO_ROOT,
  readEnvValue,
  resolveDatabaseUrl,
  withPgClient,
}
