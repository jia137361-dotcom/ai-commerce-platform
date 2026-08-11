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

const fixes = [
  'ALTER TABLE currency ADD COLUMN IF NOT EXISTS raw_rounding NUMERIC DEFAULT 0',
  'ALTER TABLE region_country ADD COLUMN IF NOT EXISTS metadata JSONB',
  "UPDATE notification_provider SET channels = '[\"feed\"]' WHERE channels = '{feed}'",
  "ALTER TABLE notification_provider ALTER COLUMN channels TYPE JSONB USING channels::text::jsonb",
];

async function fix() {
  await db.connect();
  for (const sql of fixes) {
    try {
      await db.query(sql);
      console.log('OK:', sql.substring(0, 70));
    } catch (e) {
      console.log('ERR:', sql.substring(0, 70), '-', e.message.substring(0, 60));
    }
  }
  await db.end();
  console.log('Done!');
}

fix().catch(console.error);
