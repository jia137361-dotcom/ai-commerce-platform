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
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'mc_supplier'
    ORDER BY ordinal_position
  `);
  
  console.log('mc_supplier columns:');
  for (const row of result.rows) {
    console.log('  ' + row.column_name);
  }
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
