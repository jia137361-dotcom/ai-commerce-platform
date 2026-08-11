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
  
  const result = await client.query(`
    SELECT metadata->>'produce_country' as country, COUNT(*) as count 
    FROM mc_product 
    WHERE metadata->>'produce_country' IS NOT NULL 
    GROUP BY country 
    ORDER BY count DESC
  `);
  
  console.log('Products by produce_country in metadata:');
  for (const row of result.rows) {
    console.log(`  ${row.country}: ${row.count}`);
  }
  
  const total = await client.query('SELECT COUNT(*) as count FROM mc_product');
  console.log(`\nTotal products: ${total.rows[0].count}`);
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
