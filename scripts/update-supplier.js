const { Client } = require('pg');

const client = new Client({
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false
});

async function main() {
  await client.connect();
  
  // Update S2BDIY supplier
  await client.query(
    "UPDATE mc_supplier SET ship_from_country = 'US', ship_to_regions = '[\"us\"]'::jsonb WHERE code = 's2bdiy'"
  );
  
  // Update Mock supplier
  await client.query(
    "UPDATE mc_supplier SET ship_from_country = 'US', ship_to_regions = '[\"us\"]'::jsonb WHERE code = 'citigoo_mock'"
  );
  
  // Verify
  const result = await client.query('SELECT id, code, name, ship_from_country, ship_to_regions FROM mc_supplier');
  console.log('Suppliers:');
  for (const row of result.rows) {
    console.log(`  ${row.code}: ${row.name} → ship_from: ${row.ship_from_country}, ship_to: ${JSON.stringify(row.ship_to_regions)}`);
  }
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
