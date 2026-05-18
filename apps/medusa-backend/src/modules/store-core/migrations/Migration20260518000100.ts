import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260518000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_supplier" ("id" text not null, "code" text not null, "name" text not null, "country" text null, "status" text check ("status" in ('active', 'inactive', 'archived')) not null default 'active', "raw_json" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_supplier_pkey" primary key ("id"));`
    )
    this.addSql(
      `create table if not exists "mc_supplier_product" ("id" text not null, "supplier_id" text not null, "supplier_product_id" text not null, "platform_product_id" text not null, "name" text not null, "category" text not null, "base_cost" real not null default 0, "currency" text not null default 'usd', "status" text check ("status" in ('active', 'inactive', 'archived')) not null default 'active', "raw_json" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_supplier_product_pkey" primary key ("id"));`
    )
    this.addSql(
      `create table if not exists "mc_supplier_product_variant" ("id" text not null, "supplier_product_id" text not null, "supplier_variant_id" text not null, "color" text null, "size" text null, "sku" text not null, "cost" real not null default 0, "stock_status" text check ("stock_status" in ('in_stock', 'out_of_stock', 'unknown')) not null default 'in_stock', "raw_json" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_supplier_product_variant_pkey" primary key ("id"));`
    )
    this.addSql(
      `create table if not exists "mc_supplier_print_spec" ("id" text not null, "supplier_product_id" text not null, "supplier_variant_id" text null, "print_position" text not null, "print_file_width" integer not null, "print_file_height" integer not null, "dpi" integer not null, "accepted_formats" text[] null, "background_required" boolean not null default false, "safe_margin" integer null, "bleed" integer null, "color_mode" text not null default 'RGB', "status" text check ("status" in ('active', 'inactive', 'archived')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_supplier_print_spec_pkey" primary key ("id"));`
    )
    this.addSql(
      `create table if not exists "mc_platform_design_template" ("id" text not null, "platform_product_id" text not null, "name" text not null, "canvas_width" integer not null, "canvas_height" integer not null, "design_area_x" integer not null, "design_area_y" integer not null, "design_area_width" integer not null, "design_area_height" integer not null, "preview_background_url" text null, "status" text check ("status" in ('active', 'inactive', 'archived')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_platform_design_template_pkey" primary key ("id"));`
    )
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_status" ON "mc_supplier" ("status") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_product_platform_product_id" ON "mc_supplier_product" ("platform_product_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_product_supplier_id" ON "mc_supplier_product" ("supplier_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_product_variant_product_id" ON "mc_supplier_product_variant" ("supplier_product_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_print_spec_product_id" ON "mc_supplier_print_spec" ("supplier_product_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mc_platform_design_template_product_id" ON "mc_platform_design_template" ("platform_product_id") WHERE deleted_at IS NULL;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "supplier_id" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "supplier_variant_id" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "mockup_image_url" text null;`)
    this.addSql(`alter table if exists "mc_product" add column if not exists "print_file_url" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "mc_product" drop column if exists "print_file_url";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "mockup_image_url";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "supplier_variant_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "supplier_id";`)
    this.addSql(`drop table if exists "mc_platform_design_template" cascade;`)
    this.addSql(`drop table if exists "mc_supplier_print_spec" cascade;`)
    this.addSql(`drop table if exists "mc_supplier_product_variant" cascade;`)
    this.addSql(`drop table if exists "mc_supplier_product" cascade;`)
    this.addSql(`drop table if exists "mc_supplier" cascade;`)
  }
}
