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

const migrations = [
  'ALTER TABLE notification_provider ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true',
  'ALTER TABLE notification_provider ADD COLUMN IF NOT EXISTS handle VARCHAR(255)',
  'ALTER TABLE notification_provider ADD COLUMN IF NOT EXISTS name VARCHAR(255)',
  'ALTER TABLE notification_provider ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT \'[]\'',
];

async function fixDatabase() {
  await db.connect();
  
  for (const sql of migrations) {
    try {
      await db.query(sql);
      console.log('OK:', sql.substring(0, 60));
    } catch (e) {
      console.log('SKIP:', sql.substring(0, 60), '-', e.message);
    }
  }
  
  await db.end();
  console.log('Done!');
}

fixDatabase().catch(console.error);
