/**
 * Update ship_from_country for all products based on produce_country in metadata
 * Run: node scripts/update-ship-from.js
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
    
    // Get all products with produce_country in metadata
    const result = await client.query(`
      SELECT id, metadata->>'produce_country' as produce_country, ship_from_country 
      FROM mc_product 
      WHERE metadata->>'produce_country' IS NOT NULL
    `);
    
    console.log(`Found ${result.rows.length} products with produce_country`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const row of result.rows) {
      const produceCountry = row.produce_country;
      const currentShipFrom = row.ship_from_country;
      
      // Use produce_country as ship_from_country (they are the same for POD products)
      if (produceCountry && produceCountry !== currentShipFrom) {
        await client.query(
          'UPDATE mc_product SET ship_from_country = $1 WHERE id = $2',
          [produceCountry, row.id]
        );
        updated++;
        if (updated % 100 === 0) {
          console.log(`Updated ${updated} products...`);
        }
      } else {
        skipped++;
      }
    }
    
    console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
    
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
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
