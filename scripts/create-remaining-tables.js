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

const sql = `
CREATE TABLE IF NOT EXISTS api_key (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  redacted TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_identity (
  id TEXT PRIMARY KEY,
  app_metadata JSONB,
  user_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_provider (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  auth_identity_id TEXT,
  user_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variant_inventory_item (
  id TEXT PRIMARY KEY,
  inventory_item_id TEXT,
  variant_id TEXT,
  required_quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS product_variant_price (
  id TEXT PRIMARY KEY,
  variant_id TEXT,
  currency_code TEXT,
  amount INTEGER,
  region_id TEXT,
  min_quantity INTEGER,
  max_quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS product_variant_tier_price (
  id TEXT PRIMARY KEY,
  variant_id TEXT,
  currency_code TEXT,
  amount INTEGER,
  min_quantity INTEGER,
  max_quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS publishable_api_key (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  redacted TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by TEXT,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS secret_api_key (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  redacted TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by TEXT,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_level (
  id TEXT PRIMARY KEY,
  inventory_item_id TEXT,
  location_id TEXT,
  stocked_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  incoming_quantity INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_item (
  id TEXT PRIMARY KEY,
  sku TEXT,
  origin_country TEXT,
  mid_code TEXT,
  material TEXT,
  weight INTEGER,
  length INTEGER,
  width INTEGER,
  height INTEGER,
  requires_shipping BOOLEAN DEFAULT true,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS price_list (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  status TEXT DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS price_set (
  id TEXT PRIMARY KEY,
  money_amounts JSONB,
  rule_conditions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS product_category_tree (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  parent_category_id TEXT,
  parent_category_tree_id TEXT,
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS product_set (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  handle TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS product_link (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  product_set_id TEXT,
  product_collection_id TEXT,
  product_tag_id TEXT,
  product_type_id TEXT,
  product_category_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS upload (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS file (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
`;

async function create() {
  await db.connect();
  try {
    await db.query(sql);
    console.log('All remaining tables created!');
  } catch(e) {
    console.log('Error:', e.message);
  }
  await db.end();
}

create().catch(console.error);
