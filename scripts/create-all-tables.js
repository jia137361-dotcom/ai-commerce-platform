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

// Create all missing Medusa v2 core tables
const sql = `
-- store
CREATE TABLE IF NOT EXISTS store (
  id TEXT PRIMARY KEY DEFAULT 'store_01HQF0T0XJYQKZ9F0KZ0KZ0KZ',
  name TEXT NOT NULL DEFAULT 'Medusa Store',
  default_sales_channel_id TEXT,
  default_location_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create default store if not exists
INSERT INTO store (id, name) VALUES ('store_01HQF0T0XJYQKZ9F0KZ0KZ0KZ', 'CitiGoo Store') ON CONFLICT DO NOTHING;

-- user
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'member',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- customer
CREATE TABLE IF NOT EXISTS customer (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  metadata JSONB,
  has_account BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- address
CREATE TABLE IF NOT EXISTS address (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  company TEXT,
  first_name TEXT,
  last_name TEXT,
  address_1 TEXT,
  address_2 TEXT,
  city TEXT,
  country_code TEXT,
  province TEXT,
  postal_code TEXT,
  phone TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- product (Medusa core)
CREATE TABLE IF NOT EXISTS product (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  handle TEXT,
  subtitle TEXT,
  status TEXT DEFAULT 'draft',
  thumbnail TEXT,
  weight INTEGER,
  length INTEGER,
  width INTEGER,
  height INTEGER,
  origin_country TEXT,
  hs_code TEXT,
  material TEXT,
  collection_id TEXT,
  type_id TEXT,
  discountable BOOLEAN DEFAULT true,
  external_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- product_variant
CREATE TABLE IF NOT EXISTS product_variant (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  product_id TEXT,
  sku TEXT,
  barcode TEXT,
  ean TEXT,
  upc TEXT,
  inventory_quantity INTEGER DEFAULT 0,
  allow_backorder BOOLEAN DEFAULT false,
  manage_inventory BOOLEAN DEFAULT true,
  hs_code TEXT,
  origin_country TEXT,
  mid_code TEXT,
  material TEXT,
  weight INTEGER,
  length INTEGER,
  width INTEGER,
  height INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- product_option
CREATE TABLE IF NOT EXISTS product_option (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  product_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- product_option_value
CREATE TABLE IF NOT EXISTS product_option_value (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  option_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- product_image
CREATE TABLE IF NOT EXISTS product_image (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- product_tag
CREATE TABLE IF NOT EXISTS product_tag (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- product_type
CREATE TABLE IF NOT EXISTS product_type (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- collection
CREATE TABLE IF NOT EXISTS collection (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  handle TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- customer_group
CREATE TABLE IF NOT EXISTS customer_group (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- shipping_profile
CREATE TABLE IF NOT EXISTS shipping_profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'default',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- shipping_option
CREATE TABLE IF NOT EXISTS shipping_option (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region_id TEXT,
  profile_id TEXT,
  provider_id TEXT,
  price_type TEXT,
  amount INTEGER,
  is_requirement BOOLEAN DEFAULT false,
  admin_only BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- discount
CREATE TABLE IF NOT EXISTS discount (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  is_dynamic BOOLEAN DEFAULT false,
  rule_id TEXT,
  is_disabled BOOLEAN DEFAULT false,
  parent_discount_id TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  valid_duration TEXT,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- gift_card
CREATE TABLE IF NOT EXISTS gift_card (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  value INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  region_id TEXT,
  is_disabled BOOLEAN DEFAULT false,
  ends_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- idempotency_key
CREATE TABLE IF NOT EXISTS idempotency_key (
  id TEXT PRIMARY KEY,
  idempotency_expires_at TIMESTAMPTZ,
  request_path TEXT,
  request_method TEXT,
  request_params JSONB,
  request_body JSONB,
  response_code INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  locked_at TIMESTAMPTZ
);

-- session (store auth)
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  expires_at TIMESTAMPTZ,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- cart
CREATE TABLE IF NOT EXISTS cart (
  id TEXT PRIMARY KEY,
  currency_code TEXT,
  email TEXT,
  billing_address_id TEXT,
  shipping_address_id TEXT,
  region_id TEXT,
  customer_id TEXT,
  payment_session_id TEXT,
  payment_id TEXT,
  shipping_methods JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- line_item
CREATE TABLE IF NOT EXISTS line_item (
  id TEXT PRIMARY KEY,
  cart_id TEXT,
  order_id TEXT,
  swap_id TEXT,
  claim_order_id TEXT,
  original_item_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  is_giftcard BOOLEAN DEFAULT false,
  should_merge BOOLEAN DEFAULT true,
  allow_discounts BOOLEAN DEFAULT true,
  has_shipping BOOLEAN DEFAULT false,
  unit_price INTEGER NOT NULL,
  variant_id TEXT,
  quantity INTEGER NOT NULL,
  fulfilled_quantity INTEGER,
  returned_quantity INTEGER,
  shipped_quantity INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- line_item_adjustment
CREATE TABLE IF NOT EXISTS line_item_adjustment (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  description TEXT,
  discount_id TEXT,
  amount INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- line_item_tax_line
CREATE TABLE IF NOT EXISTS line_item_tax_line (
  id TEXT PRIMARY KEY,
  rate NUMERIC NOT NULL,
  name TEXT NOT NULL,
  item_id TEXT,
  code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- order
CREATE TABLE IF NOT EXISTS "order" (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  fulfillment_status TEXT DEFAULT 'not_fulfilled',
  payment_status TEXT DEFAULT 'not_paid',
  display_id INTEGER,
  cart_id TEXT,
  customer_id TEXT,
  email TEXT,
  billing_address_id TEXT,
  shipping_address_id TEXT,
  region_id TEXT,
  currency_code TEXT,
  tax_rate NUMERIC,
  discounts JSONB,
  gift_cards JSONB,
  shipping_methods JSONB,
  payments JSONB,
  fulfillments JSONB,
  returns JSONB,
  claims JSONB,
  edits JSONB,
  refunds JSONB,
  draft_order_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- payment
CREATE TABLE IF NOT EXISTS payment (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  swap_id TEXT,
  cart_id TEXT,
  amount INTEGER NOT NULL,
  currency_code TEXT,
  amount_refunded INTEGER DEFAULT 0,
  provider_id TEXT,
  data JSONB,
  captured_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- payment_session
CREATE TABLE IF NOT EXISTS payment_session (
  id TEXT PRIMARY KEY,
  cart_id TEXT,
  provider_id TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  data JSONB,
  status TEXT DEFAULT 'pending',
  amount INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- refund
CREATE TABLE IF NOT EXISTS refund (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  payment_id TEXT,
  amount INTEGER NOT NULL,
  note TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- return
CREATE TABLE IF NOT EXISTS "return" (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  status TEXT DEFAULT 'requested',
  refund_amount INTEGER,
  received_at TIMESTAMPTZ,
  reason TEXT,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- return_item
CREATE TABLE IF NOT EXISTS return_item (
  id TEXT PRIMARY KEY,
  return_id TEXT,
  item_id TEXT,
  reason_id TEXT,
  quantity INTEGER NOT NULL,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- fulfillment
CREATE TABLE IF NOT EXISTS fulfillment (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  claim_order_id TEXT,
  swap_id TEXT,
  provider_id TEXT,
  location_id TEXT,
  shipping_data JSONB,
  canceled_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- fulfillment_item
CREATE TABLE IF NOT EXISTS fulfillment_item (
  id TEXT PRIMARY KEY,
  fulfillment_id TEXT,
  item_id TEXT,
  quantity INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- fulfillment_payment
CREATE TABLE IF NOT EXISTS fulfillment_payment (
  id TEXT PRIMARY KEY,
  fulfillment_id TEXT,
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- swap
CREATE TABLE IF NOT EXISTS swap (
  id TEXT PRIMARY KEY,
  fulfillment_status TEXT DEFAULT 'not_fulfilled',
  payment_status TEXT DEFAULT 'not_paid',
  order_id TEXT,
  cart_id TEXT,
  shipping_address_id TEXT,
  region_id TEXT,
  discount_total INTEGER,
  shipping_total INTEGER,
  refund_total INTEGER,
  tax_total INTEGER,
  customs_cost INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- draft_order
CREATE TABLE IF NOT EXISTS draft_order (
  id TEXT PRIMARY KEY,
  display_id INTEGER,
  cart_id TEXT,
  order_id TEXT,
  billing_address_id TEXT,
  shipping_address_id TEXT,
  region_id TEXT,
  discount_total INTEGER,
  tax_total INTEGER,
  shipping_total INTEGER,
  subtotal INTEGER,
  total INTEGER,
  status TEXT DEFAULT 'open',
  email TEXT,
  canceled_at TIMESTAMPTZ,
  metadata JSONB,
  no_notification_order BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- shipping_method
CREATE TABLE IF NOT EXISTS shipping_method (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  cart_id TEXT,
  swap_id TEXT,
  return_id TEXT,
  shipping_option_id TEXT,
  discount_total INTEGER,
  tax_total INTEGER,
  amount INTEGER,
  price_type TEXT,
  data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- shipping_option_requirement
CREATE TABLE IF NOT EXISTS shipping_option_requirement (
  id TEXT PRIMARY KEY,
  shipping_option_id TEXT,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  discount_only BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- shipping_method_tax_line
CREATE TABLE IF NOT EXISTS shipping_method_tax_line (
  id TEXT PRIMARY KEY,
  rate NUMERIC NOT NULL,
  name TEXT NOT NULL,
  shipping_method_id TEXT,
  code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- discount_rule
CREATE TABLE IF NOT EXISTS discount_rule (
  id TEXT PRIMARY KEY,
  description TEXT,
  type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  allocation TEXT,
  conditions JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- gift_card_transaction
CREATE TABLE IF NOT EXISTS gift_card_transaction (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT,
  order_id TEXT,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- product_category_product
CREATE TABLE IF NOT EXISTS product_category_product (
  product_category_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  PRIMARY KEY (product_category_id, product_id)
);

-- product_collection_product
CREATE TABLE IF NOT EXISTS product_collection_product (
  product_collection_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  PRIMARY KEY (product_collection_id, product_id)
);

-- product_variant_option
CREATE TABLE IF NOT EXISTS product_variant_option (
  product_variant_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  PRIMARY KEY (product_variant_id, option_id)
);

-- product_tag_product
CREATE TABLE IF NOT EXISTS product_tag_product (
  product_tag_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  PRIMARY KEY (product_tag_id, product_id)
);

-- tax_rate
CREATE TABLE IF NOT EXISTS tax_rate (
  id TEXT PRIMARY KEY,
  rate NUMERIC,
  code TEXT,
  name TEXT NOT NULL,
  region_id TEXT,
  product_type_id TEXT,
  shipping_option_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- order_edit
CREATE TABLE IF NOT EXISTS order_edit (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  internal_note TEXT,
  created_by_user_id TEXT,
  created_by_email TEXT,
  requested_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  change_processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'created',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- analytics_config
CREATE TABLE IF NOT EXISTS analytics_config (
  id TEXT PRIMARY KEY,
  anonymize_ip BOOLEAN DEFAULT true,
  opt_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- store_currency
CREATE TABLE IF NOT EXISTS store_currency (
  store_id TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  PRIMARY KEY (store_id, currency_code)
);
`;

async function createTables() {
  await db.connect();
  try {
    await db.query(sql);
    console.log('All Medusa core tables created successfully!');
    
    const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('\nTotal tables:', tables.rows.length);
  } catch (e) {
    console.error('Error:', e.message);
  }
  await db.end();
}

createTables().catch(console.error);
