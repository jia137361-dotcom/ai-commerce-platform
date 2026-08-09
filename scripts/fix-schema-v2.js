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
  // currency.raw_rounding should be JSONB not NUMERIC
  'ALTER TABLE currency DROP COLUMN IF EXISTS raw_rounding',
  "ALTER TABLE currency ADD COLUMN raw_rounding JSONB DEFAULT '{\"value\":\"0\",\"precision\":20}'",
  // Fix currency id
  "ALTER TABLE currency ALTER COLUMN id SET DEFAULT NULL",
  // notification_provider channels - drop and recreate
  'ALTER TABLE notification_provider DROP COLUMN IF EXISTS channels',
  "ALTER TABLE notification_provider ADD COLUMN channels JSONB DEFAULT '[]'::jsonb",
  // store - ensure default store exists
  "INSERT INTO store (id, name, created_at, updated_at) VALUES ('store_01', 'CitiGoo Store', NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
  // region - ensure default region exists
  "INSERT INTO region (id, name, currency_code, created_at, updated_at) VALUES ('reg_01', 'Default Region', 'usd', NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
  // sales_channel - ensure default exists
  "INSERT INTO sales_channel (id, name, is_disabled, created_at, updated_at) VALUES ('sc_01', 'Default Channel', false, NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
];

async function fix() {
  await db.connect();
  for (const sql of fixes) {
    try {
      await db.query(sql);
      console.log('OK:', sql.substring(0, 70));
    } catch (e) {
      console.log('ERR:', sql.substring(0, 70), '-', e.message.substring(0, 80));
    }
  }
  await db.end();
}

fix().catch(console.error);
