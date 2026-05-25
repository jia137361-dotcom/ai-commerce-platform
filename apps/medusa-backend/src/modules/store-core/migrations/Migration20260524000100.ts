import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260524000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mc_supplier" add column if not exists "api_base_url" text null;`)
    this.addSql(`alter table if exists "mc_supplier" add column if not exists "test_api_base_url" text null;`)

    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "basic_product_id" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "basic_product_code" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "basic_product_name" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "basic_product_en_name" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "purchase_price" real null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "product_show_master_image" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "supplier_mockup_image_url" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "produce_country" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "warehouse_name" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product" add column if not exists "deliver_goods_text" text null;`)

    this.addSql(`alter table if exists "mc_supplier_product_variant" add column if not exists "supplier_size_id" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" add column if not exists "supplier_color_id" text null;`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" add column if not exists "weight" real null;`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" add column if not exists "length" real null;`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" add column if not exists "width" real null;`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" add column if not exists "height" real null;`)

    this.addSql(`alter table if exists "mc_supplier_print_spec" add column if not exists "view_id" text null;`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" add column if not exists "view_name" text null;`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" add column if not exists "view_en_name" text null;`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" add column if not exists "design_area_width" integer null;`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" add column if not exists "design_area_height" integer null;`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" add column if not exists "design_area_unit" text not null default 'px';`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" add column if not exists "design_type" integer null;`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" add column if not exists "tip_level" text null;`)

    this.addSql(`alter table if exists "mc_product" add column if not exists "s2b_basic_product_id" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "s2b_material_id" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "s2b_designed_product_id" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "s2b_mockup_image_url" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "s2b_size_id" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "s2b_color_id" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "s2b_view_id" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "s2b_design_type" integer null;`)
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "supplier_product_status" text check ("supplier_product_status" in ('not_created', 'material_uploaded', 'product_created', 'product_synced', 'failed')) not null default 'not_created';`
    )
    this.addSql(`alter table if exists "mc_product" add column if not exists "supplier_product_error" text null;`)

    this.addSql(
      `create table if not exists "mc_product_asset" ("id" text not null, "store_id" text not null, "product_id" text not null, "ai_job_id" text null, "supplier_id" text null, "supplier_material_id" text null, "supplier_material_name" text null, "supplier_material_url" text null, "asset_type" text check ("asset_type" in ('design', 'print_file', 'supplier_material', 'supplier_mockup')) not null, "url" text null, "file_format" text null, "width" integer null, "height" integer null, "dpi" integer null, "view_id" text null, "design_type" integer null, "metadata_json" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_product_asset_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_asset_product_id" ON "mc_product_asset" ("product_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mc_supplier_order" ("id" text not null, "store_id" text not null, "order_id" text not null, "supplier_id" text not null, "supplier_order_id" text null, "third_order_id" text not null, "platform" integer not null default 99, "logistics_id" text null, "logistics_name" text null, "product_amount" real null, "shipping_amount" real null, "total_amount" real null, "supplier_status" text not null default 'not_pushed', "supplier_status_text" text null, "supplier_pay_status" text not null default 'payment_pending', "supplier_pay_status_text" text null, "tracking_number" text null, "tracking_url" text null, "waybill_url" text null, "raw_request_json" jsonb null, "raw_response_json" jsonb null, "last_synced_at" timestamptz null, "error_message" text null, "pay_retry_count" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_supplier_order_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_order_order_id" ON "mc_supplier_order" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_order_supplier_status" ON "mc_supplier_order" ("supplier_status") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mc_supplier_order_item" ("id" text not null, "supplier_order_id" text not null, "order_item_id" text null, "third_item_id" text null, "basic_product_id" text null, "supplier_product_id" text null, "supplier_product_name" text null, "supplier_size_id" text null, "supplier_color_id" text null, "supplier_size_name" text null, "supplier_color_name" text null, "show_image" text null, "quantity" integer not null default 1, "product_amount" real null, "total_amount" real null, "total_weight" real null, "raw_json" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_supplier_order_item_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_order_item_supplier_order_id" ON "mc_supplier_order_item" ("supplier_order_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_supplier_order_item" cascade;`)
    this.addSql(`drop table if exists "mc_supplier_order" cascade;`)
    this.addSql(`drop table if exists "mc_product_asset" cascade;`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "supplier_product_error";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "supplier_product_status";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "s2b_design_type";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "s2b_view_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "s2b_color_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "s2b_size_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "s2b_mockup_image_url";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "s2b_designed_product_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "s2b_material_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "s2b_basic_product_id";`)
  }
}
