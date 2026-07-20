/**
 * Update ship_from_country based on S2BDIY produce_area_text (actual shipping origin).
 *
 * Run:
 *   S2BDIY_PRODUCTS_JSON=path/to/s2bdiy-products.json node scripts/update-ship-from-area.js
 *
 * Default JSON path: scripts/s2bdiy-products.json (not committed — export from S2BDIY first).
 * Requires DATABASE_URL (env or apps/medusa-backend/.env).
 */

const fs = require("fs")
const path = require("path")
const { REPO_ROOT, withPgClient } = require("./lib/pg-client")

const AREA_TO_COUNTRY = {
  国内发全球: "CN",
  国内: "CN",
  中国: "CN",
  美国本土: "US",
  英格兰: "GB",
  俄罗斯本土: "RU",
  澳大利亚本土: "AU",
  欧洲: "EU",
  德国: "DE",
  加拿大本土: "CA",
  意大利本土: "IT",
  法国本土: "FR",
  韩国本土: "KR",
  西班牙本土: "ES",
  墨西哥本土: "MX",
  菲律宾本土: "PH",
  波兰本土: "PL",
}

function resolveShipFromCountry(produceAreaText) {
  if (!produceAreaText) return null
  for (const [keyword, code] of Object.entries(AREA_TO_COUNTRY)) {
    if (produceAreaText.includes(keyword)) {
      return code
    }
  }
  return null
}

function resolveProductsJsonPath() {
  const configured = process.env.S2BDIY_PRODUCTS_JSON?.trim()
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(REPO_ROOT, configured)
  }
  return path.join(REPO_ROOT, "scripts/s2bdiy-products.json")
}

async function main() {
  const jsonPath = resolveProductsJsonPath()
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `Missing S2BDIY product export: ${jsonPath}. Set S2BDIY_PRODUCTS_JSON or place scripts/s2bdiy-products.json.`
    )
  }

  const rawData = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
  if (!Array.isArray(rawData)) {
    throw new Error(`Expected JSON array in ${jsonPath}`)
  }
  console.log(`Loaded ${rawData.length} raw products from ${jsonPath}`)

  const areaMap = {}
  for (const product of rawData) {
    areaMap[product.id] = product.produce_area_text
  }

  await withPgClient(async (client) => {
    console.log("Connected to database")

    const result = await client.query(`
      SELECT id, metadata->>'supplier_product_id' AS supplier_product_id, ship_from_country
      FROM mc_product
      WHERE id LIKE 'prod_s2bdiy_%'
    `)

    console.log(`Found ${result.rows.length} S2BDIY products in database`)

    let updated = 0
    let notFound = 0

    for (const row of result.rows) {
      const supplierProductId = parseInt(String(row.id).replace("prod_s2bdiy_", ""), 10)
      const raw = rawData.find((item) => Number(item.id) === supplierProductId)
      const produceAreaText = raw?.produce_area_text ?? areaMap[supplierProductId]
      let shipFromCountry = resolveShipFromCountry(produceAreaText)
      if (!shipFromCountry && typeof raw?.produce_country === "string" && raw.produce_country.trim()) {
        shipFromCountry = raw.produce_country.trim().toUpperCase()
      }

      if (shipFromCountry && shipFromCountry !== row.ship_from_country) {
        await client.query("UPDATE mc_product SET ship_from_country = $1 WHERE id = $2", [
          shipFromCountry,
          row.id,
        ])
        updated++
      } else if (!shipFromCountry) {
        notFound++
      }
    }

    console.log(`\nDone! Updated: ${updated}, Not found: ${notFound}`)

    const summary = await client.query(`
      SELECT ship_from_country, COUNT(*) AS count
      FROM mc_product
      WHERE ship_from_country IS NOT NULL
      GROUP BY ship_from_country
      ORDER BY count DESC
    `)

    console.log("\nShip from summary:")
    for (const row of summary.rows) {
      console.log(`  ${row.ship_from_country}: ${row.count} products`)
    }
  })
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
