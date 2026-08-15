/**
 * Restore ship_from_country based on produce_country from metadata
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
  
  // Restore ship_from_country from produce_country in metadata
  const result = await client.query(`
    UPDATE mc_product 
    SET ship_from_country = metadata->>'produce_country'
    WHERE metadata->>'produce_country' IS NOT NULL
  `);
  
  console.log(`Restored ${result.rowCount} products`);
  
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
