/**
 * Fast batch update ship_from_country based on produce_country
 * Run: node scripts/update-ship-from-fast.js
 */

const { Client } = require('pg');

const DB_CONFIG = {
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false,
  connectionTimeoutMillis: 30000
};

async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Batch update using CASE statement
    const result = await client.query(`
      UPDATE mc_product 
      SET ship_from_country = metadata->>'produce_country'
      WHERE metadata->>'produce_country' IS NOT NULL
        AND (ship_from_country IS NULL OR ship_from_country != metadata->>'produce_country')
    `);
    
    console.log(`Updated ${result.rowCount} products`);
    
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
    
    const total = await client.query('SELECT COUNT(*) as count FROM mc_product');
    console.log(`\nTotal products: ${total.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
