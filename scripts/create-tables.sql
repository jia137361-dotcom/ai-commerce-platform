-- MedusaJS Core Tables

CREATE TABLE IF NOT EXISTS "tax_provider" (
  "id" text NOT NULL,
  "is_enabled" boolean not null default true,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "tax_provider_pkey" primary key ("id")
);
INSERT INTO "tax_provider" ("id", "is_enabled") VALUES ('tp_system', true) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "payment_provider" (
  "id" text NOT NULL,
  "is_installed" boolean not null default true,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "payment_provider_pkey" primary key ("id")
);
INSERT INTO "payment_provider" ("id", "is_installed") VALUES ('pp_stripe_stripe', true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "payment_provider" ("id", "is_installed") VALUES ('pp_system_default', true) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "fulfillment_provider" (
  "id" text NOT NULL,
  "is_installed" boolean not null default true,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "fulfillment_provider_pkey" primary key ("id")
);
INSERT INTO "fulfillment_provider" ("id", "is_installed") VALUES ('fp_manual', true) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "notification_provider" (
  "id" text NOT NULL,
  "is_installed" boolean not null default true,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "notification_provider_pkey" primary key ("id")
);
INSERT INTO "notification_provider" ("id", "is_installed") VALUES ('np_email', true) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "currency" (
  "code" text NOT NULL,
  "name" text NOT NULL,
  "symbol" text NOT NULL,
  "symbol_native" text NOT NULL,
  "decimal_digits" int not null default 0,
  "name_plural" text NOT NULL,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "currency_pkey" primary key ("code")
);

CREATE TABLE IF NOT EXISTS "region" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "currency_code" text NOT NULL,
  "automatic_taxes" boolean not null default false,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "region_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "region_country" (
  "id" text NOT NULL,
  "iso_2" text NOT NULL,
  "iso_3" text NOT NULL,
  "num_code" int NOT NULL,
  "name" text NOT NULL,
  "display_name" text NOT NULL,
  "region_id" text null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "region_country_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "user" (
  "id" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "first_name" text null,
  "last_name" text null,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "user_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "auth_identity" (
  "id" text NOT NULL,
  "app_metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "auth_identity_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "provider_identity" (
  "id" text NOT NULL,
  "entity_id" text NOT NULL,
  "provider" text NOT NULL,
  "auth_identity_id" text NOT NULL,
  "user_metadata" jsonb null,
  "provider_metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "provider_identity_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "product" (
  "id" text NOT NULL,
  "title" text NOT NULL,
  "subtitle" text null,
  "description" text null,
  "handle" text null,
  "is_giftcard" boolean not null default false,
  "status" text not null default 'draft',
  "thumbnail" text null,
  "profile_id" text null,
  "collection_id" text null,
  "type_id" text null,
  "weight" numeric null,
  "length" numeric null,
  "height" numeric null,
  "width" numeric null,
  "origin_country" text null,
  "hs_code" text null,
  "material" text null,
  "mid_code" text null,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "product_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "product_option" (
  "id" text NOT NULL,
  "title" text NOT NULL,
  "product_id" text NOT NULL,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "product_option_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "product_option_value" (
  "id" text NOT NULL,
  "value" text NOT NULL,
  "option_id" text NOT NULL,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "product_option_value_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "product_variant" (
  "id" text NOT NULL,
  "title" text NOT NULL,
  "product_id" text NOT NULL,
  "sku" text null,
  "barcode" text null,
  "allow_backorder" boolean not null default false,
  "manage_inventory" boolean not null default true,
  "inventory_quantity" int not null default 0,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "product_variant_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "product_category" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "description" text null,
  "handle" text null,
  "is_active" boolean not null default true,
  "is_internal" boolean not null default false,
  "rank" int null,
  "parent_category_id" text null,
  "path" text null,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "product_category_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "cart" (
  "id" text NOT NULL,
  "region_id" text null,
  "email" text null,
  "currency_code" text not null,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "cart_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "shipping_option" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "region_id" text NOT NULL,
  "provider_id" text null,
  "price_type" text not null default 'flat',
  "amount" numeric not null,
  "is_return" boolean not null default false,
  "admin_only" boolean not null default false,
  "data" jsonb null,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "shipping_option_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "shipping_method" (
  "id" text NOT NULL,
  "shipping_option_id" text NOT NULL,
  "cart_id" text null,
  "order_id" text null,
  "price" numeric not null,
  "data" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "shipping_method_pkey" primary key ("id")
);

-- Custom Module Tables

CREATE TABLE IF NOT EXISTS "mc_store" (
  "id" text NOT NULL,
  "owner_user_id" text null,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "logo_url" text null,
  "banner_url" text null,
  "description" text null,
  "status" text not null default 'active',
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "mc_store_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "mc_supplier" (
  "id" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "country" text null,
  "status" text not null default 'active',
  "raw_json" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "mc_supplier_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "mc_product_category" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "description" text null,
  "parent_id" text null,
  "status" text not null default 'active',
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "mc_product_category_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "mc_supplier_product" (
  "id" text NOT NULL,
  "supplier_id" text NOT NULL,
  "name" text NOT NULL,
  "category" text null,
  "base_cost" numeric default 0,
  "currency" text default 'usd',
  "status" text not null default 'active',
  "raw_json" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "mc_supplier_product_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "mc_supplier_product_variant" (
  "id" text NOT NULL,
  "supplier_product_id" text NOT NULL,
  "color" text null,
  "size" text null,
  "sku" text null,
  "cost" numeric default 0,
  "stock_status" text default 'unknown',
  "raw_json" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "mc_supplier_product_variant_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "mc_product" (
  "id" text NOT NULL,
  "store_id" text null,
  "title" text NOT NULL,
  "description" text null,
  "status" text default 'draft',
  "source" text default 'manual',
  "price" numeric null,
  "cost" numeric null,
  "tags" jsonb null,
  "category_ids" jsonb null,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "mc_product_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "fulfillment_order" (
  "id" text NOT NULL,
  "order_id" text NOT NULL,
  "store_id" text NOT NULL,
  "supplier" text not null default 'mock',
  "supplier_order_id" text null,
  "payload" jsonb null,
  "status" text not null default 'pending',
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "fulfillment_order_pkey" primary key ("id")
);

CREATE TABLE IF NOT EXISTS "mc_shipment" (
  "id" text NOT NULL,
  "order_id" text NOT NULL,
  "store_id" text NOT NULL,
  "carrier" text null,
  "tracking_number" text null,
  "status" text not null default 'pending',
  "shipped_at" timestamptz null,
  "delivered_at" timestamptz null,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "mc_shipment_pkey" primary key ("id")
);

SELECT 'All ' || count(*) || ' tables created!' as result FROM information_schema.tables WHERE table_schema = 'public';
