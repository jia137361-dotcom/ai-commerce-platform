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
  
  // Insert S2BDIY supplier
  await client.query(`
    INSERT INTO mc_supplier (id, code, name, country, ship_from_country, ship_to_regions, status, raw_json)
    VALUES ('sup_s2bdiy', 's2bdiy', 'S2BDIY', 'US', 'US', '["us"]'::jsonb, 'active', '{"phase": "2B", "note": "S2BDIY print-on-demand supplier"}')
    ON CONFLICT (id) DO UPDATE SET 
      ship_from_country = 'US',
      ship_to_regions = '["us"]'::jsonb
  `);
  
  // Insert Mock supplier
  await client.query(`
    INSERT INTO mc_supplier (id, code, name, country, ship_from_country, ship_to_regions, status, raw_json)
    VALUES ('sup_citigoo_mock', 'citigoo_mock', 'CitiGoo Mock Supplier', 'US', 'US', '["us"]'::jsonb, 'active', '{"phase": "2A", "note": "Mock supplier"}')
    ON CONFLICT (id) DO UPDATE SET 
      ship_from_country = 'US',
      ship_to_regions = '["us"]'::jsonb
  `);
  
  // Verify
  const result = await client.query('SELECT id, code, name, ship_from_country, ship_to_regions FROM mc_supplier');
  console.log('Suppliers:');
  for (const row of result.rows) {
    console.log(`  ${row.code}: ${row.name} → ship_from: ${row.ship_from_country}, ship_to: ${JSON.stringify(row.ship_to_regions)}`);
  }
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
