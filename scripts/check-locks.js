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
  
  // Check locks
  const locks = await db.query(`
    SELECT pid, relation::regclass, mode, granted 
    FROM pg_locks 
    WHERE relation IS NOT NULL 
    AND pid != pg_backend_pid()
  `);
  console.log('Active locks:', locks.rows.length);
  locks.rows.forEach(r => console.log('  ', r.pid, r.relation, r.mode, r.granted));
  
  // Check running queries
  const queries = await db.query(`
    SELECT pid, state, query, query_start 
    FROM pg_stat_activity 
    WHERE state != 'idle' AND pid != pg_backend_pid()
  `);
  console.log('\nRunning queries:', queries.rows.length);
  queries.rows.forEach(r => console.log('  ', r.pid, r.state, r.query?.substring(0, 80)));
  
  // Check migration table
  try {
    const migrations = await db.query('SELECT * FROM mikro_orm_migrations ORDER BY id');
    console.log('\nMigrations:', migrations.rows.length);
    migrations.rows.forEach(r => console.log('  ', r.id, r.name, r.executed_at));
  } catch(e) {
    console.log('\nMigration table error:', e.message);
  }
  
  await db.end();
}

check().catch(console.error);
