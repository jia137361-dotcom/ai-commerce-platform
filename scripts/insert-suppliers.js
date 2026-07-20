/**
 * Upsert default suppliers with Ship From / Ship To fields.
 *
 * Run:
 *   node scripts/insert-suppliers.js
 *
 * Requires DATABASE_URL (env or apps/medusa-backend/.env).
 */

const { withPgClient } = require("./lib/pg-client")

async function main() {
  await withPgClient(async (client) => {
    await client.query(`
      INSERT INTO mc_supplier (id, code, name, country, ship_from_country, ship_to_regions, status, raw_json)
      VALUES (
        'sup_s2bdiy',
        's2bdiy',
        'S2BDIY',
        'US',
        'US',
        '["us"]'::jsonb,
        'active',
        '{"phase": "2B", "note": "S2BDIY print-on-demand supplier"}'
      )
      ON CONFLICT (id) DO UPDATE SET
        ship_from_country = EXCLUDED.ship_from_country,
        ship_to_regions = EXCLUDED.ship_to_regions
    `)

    await client.query(`
      INSERT INTO mc_supplier (id, code, name, country, ship_from_country, ship_to_regions, status, raw_json)
      VALUES (
        'sup_citigoo_mock',
        'citigoo_mock',
        'CitiGoo Mock Supplier',
        'US',
        'US',
        '["us"]'::jsonb,
        'active',
        '{"phase": "2A", "note": "Mock supplier"}'
      )
      ON CONFLICT (id) DO UPDATE SET
        ship_from_country = EXCLUDED.ship_from_country,
        ship_to_regions = EXCLUDED.ship_to_regions
    `)

    const result = await client.query(
      "SELECT id, code, name, ship_from_country, ship_to_regions FROM mc_supplier ORDER BY code"
    )
    console.log("Suppliers:")
    for (const row of result.rows) {
      console.log(
        `  ${row.code}: ${row.name} → ship_from: ${row.ship_from_country}, ship_to: ${JSON.stringify(row.ship_to_regions)}`
      )
    }
  })
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
