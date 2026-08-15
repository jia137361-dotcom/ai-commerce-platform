/**
 * Fix ship_from_country for all S2BDIY products to US
 * Because S2BDIY ships from US (print + package in US)
 */

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
  
  // Update all S2BDIY products to ship from US
  const result = await client.query(`
    UPDATE mc_product 
    SET ship_from_country = 'US'
    WHERE id LIKE 'prod_s2bdiy_%'
      AND (ship_from_country IS NULL OR ship_from_country != 'US')
  `);
  
  console.log(`Updated ${result.rowCount} S2BDIY products to ship from US`);
  
  // Show summary
  const summary = await client.query(`
    SELECT ship_from_country, COUNT(*) as count 
    FROM mc_product 
    WHERE ship_from_country IS NOT NULL
    GROUP BY ship_from_country 
    ORDER BY count DESC
  `);
  
  console.log('\nShip from summary:');
  for (const row of summary.rows) {
    console.log(`  ${row.ship_from_country}: ${row.count} products`);
  }
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
