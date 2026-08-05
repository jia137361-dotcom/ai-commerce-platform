const { Client } = require('pg');

const db = new Client({
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false,
  connectionTimeoutMillis: 10000
});

async function check() {
  await db.connect();
  
  const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('All tables (' + tables.rows.length + '):');
  tables.rows.forEach(r => console.log('  ' + r.table_name));
  
  const migrations = await db.query('SELECT * FROM mikro_orm_migrations ORDER BY id').catch(() => ({ rows: [] }));
  console.log('\nMigrations executed:', migrations.rows.length);
  migrations.rows.forEach(r => console.log('  ' + r.name));
  
  await db.end();
}

check().catch(console.error);
