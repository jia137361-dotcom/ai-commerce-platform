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

async function fix() {
  await db.connect();
  // Change channels to TEXT - Medusa inserts '{feed}' which is not valid JSON
  await db.query('ALTER TABLE notification_provider DROP COLUMN IF EXISTS channels');
  await db.query("ALTER TABLE notification_provider ADD COLUMN channels TEXT DEFAULT 'feed'");
  console.log('Fixed notification_provider.channels to TEXT');
  await db.end();
}

fix().catch(console.error);
