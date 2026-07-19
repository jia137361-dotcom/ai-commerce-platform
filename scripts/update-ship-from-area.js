/**
 * Update ship_from_country based on produce_area_text (actual shipping origin)
 */

const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false
});

// Map produce_area_text to country code
const AREA_TO_COUNTRY = {
  '国内发全球': 'CN',
  '美国本土': 'US',
  '英格兰': 'GB',
  '俄罗斯本土': 'RU',
  '澳大利亚本土': 'AU',
  '欧洲': 'EU',
  '德国': 'DE',
  '加拿大本土': 'CA',
  '意大利本土': 'IT',
  '法国本土': 'FR',
  '韩国本土': 'KR',
  '西班牙本土': 'ES',
  '墨西哥本土': 'MX',
  '菲律宾本土': 'PH',
  '波兰本土': 'PL',
};

function resolveShipFromCountry(produceAreaText) {
  if (!produceAreaText) return null;
  for (const [keyword, code] of Object.entries(AREA_TO_COUNTRY)) {
    if (produceAreaText.includes(keyword)) {
      return code;
    }
  }
  return null;
}

async function main() {
  await client.connect();
  console.log('Connected to database');
  
  // Load raw product data
  const rawData = JSON.parse(fs.readFileSync('scripts/s2bdiy-products.json', 'utf8'));
  console.log(`Loaded ${rawData.length} raw products`);
  
  // Create a map of product_id -> produce_area_text
  const areaMap = {};
  for (const product of rawData) {
    areaMap[product.id] = product.produce_area_text;
  }
  
  // Get all S2BDIY products from database
  const result = await client.query(`
    SELECT id, metadata->>'supplier_product_id' as supplier_product_id, ship_from_country
    FROM mc_product 
    WHERE id LIKE 'prod_s2bdiy_%'
  `);
  
  console.log(`Found ${result.rows.length} S2BDIY products in database`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const row of result.rows) {
    // Extract supplier_product_id from id (prod_s2bdiy_1234 -> 1234)
    const supplierProductId = parseInt(row.id.replace('prod_s2bdiy_', ''));
    const produceAreaText = areaMap[supplierProductId];
    const shipFromCountry = resolveShipFromCountry(produceAreaText);
    
    if (shipFromCountry && shipFromCountry !== row.ship_from_country) {
      await client.query(
        'UPDATE mc_product SET ship_from_country = $1 WHERE id = $2',
        [shipFromCountry, row.id]
      );
      updated++;
    } else if (!shipFromCountry) {
      notFound++;
    }
  }
  
  console.log(`\nDone! Updated: ${updated}, Not found: ${notFound}`);
  
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
