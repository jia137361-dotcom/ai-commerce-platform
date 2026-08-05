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
  // notification_provider - fix channels column
  `ALTER TABLE notification_provider ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '[]'`,
  
  // sales_channel
  `CREATE TABLE IF NOT EXISTS sales_channel (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_disabled BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,
  
  // currency
  `CREATE TABLE IF NOT EXISTS currency (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    symbol_native TEXT NOT NULL,
    decimal_digits INTEGER DEFAULT 2,
    rounding NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,
  
  // region_country
  `CREATE TABLE IF NOT EXISTS region_country (
    id TEXT PRIMARY KEY,
    iso_2 TEXT NOT NULL UNIQUE,
    iso_3 TEXT NOT NULL,
    num_code TEXT,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    region_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,
  
  // region
  `CREATE TABLE IF NOT EXISTS region (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency_code TEXT,
    tax_rate NUMERIC DEFAULT 0,
    tax_code TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,
  
  // money_amount
  `CREATE TABLE IF NOT EXISTS money_amount (
    id TEXT PRIMARY KEY,
    currency_code TEXT,
    amount INTEGER DEFAULT 0,
    min_quantity INTEGER,
    max_quantity INTEGER,
    variant_id TEXT,
    region_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,
  
  // product_category
  `CREATE TABLE IF NOT EXISTS product_category (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    handle TEXT,
    parent_category_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,

  // product_collection
  `CREATE TABLE IF NOT EXISTS product_collection (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    handle TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,
];

async function migrate() {
  await db.connect();
  
  for (const sql of migrations) {
    try {
      await db.query(sql);
      const tableName = sql.match(/(?:TABLE IF NOT EXISTS|TABLE)\s+(\w+)/)?.[1] || 'unknown';
      console.log('OK:', tableName);
    } catch (e) {
      console.log('ERROR:', e.message.substring(0, 80));
    }
  }
  
  await db.end();
  console.log('\nDone!');
}

migrate().catch(console.error);
