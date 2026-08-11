/**
 * Fast batch update ship_from_country from metadata.produce_country.
 *
 * Run:
 *   node scripts/update-ship-from-fast.js
 *
 * Requires DATABASE_URL (env or apps/medusa-backend/.env).
 */

const { withPgClient } = require("./lib/pg-client")

async function main() {
  await withPgClient(async (client) => {
    console.log("Connected to database")

    const result = await client.query(`
      UPDATE mc_product
      SET ship_from_country = metadata->>'produce_country'
      WHERE metadata->>'produce_country' IS NOT NULL
        AND (
          ship_from_country IS NULL
          OR ship_from_country != metadata->>'produce_country'
        )
    `)

    console.log(`Updated ${result.rowCount} products`)

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

    const total = await client.query("SELECT COUNT(*) AS count FROM mc_product")
    console.log(`\nTotal products: ${total.rows[0].count}`)
  })
}

main().catch((error) => {
  console.error("Error:", error.message)
  process.exit(1)
})
