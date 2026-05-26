import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260526000000 extends Migration {
  override async up(): Promise<void> {
    // mc_supplier — Phase 2B fields
    this.addSql(
      `alter table if exists "mc_supplier" add column if not exists "api_base_url" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier" add column if not exists "test_api_base_url" text null;`
    )

    // mc_supplier_product — Phase 2B fields
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "basic_product_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "basic_product_code" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "basic_product_name" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "basic_product_en_name" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "purchase_price" real null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "supplier_product_code" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "supplier_product_name" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "product_show_master_image" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "supplier_mockup_image_url" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "produce_country" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "warehouse_name" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product" add column if not exists "deliver_goods_text" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_product_basic_product_id" ON "mc_supplier_product" ("basic_product_id") WHERE deleted_at IS NULL;`
    )

    // mc_supplier_product_variant — Phase 2B fields
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "basic_product_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "supplier_variant_code" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "supplier_size_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "supplier_color_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "size_name" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "color_name" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "weight" real null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "length" real null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "width" real null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_product_variant" add column if not exists "height" real null;`
    )

    // mc_supplier_print_spec — Phase 2B fields
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "basic_product_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "view_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "view_name" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "view_en_name" text null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "design_area_width" integer null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "design_area_height" integer null;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "design_area_unit" text not null default 'px';`
    )
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "design_type" integer not null default 1;`
    )
    this.addSql(
      `alter table if exists "mc_supplier_print_spec" add column if not exists "tip_level" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_print_spec_view_id" ON "mc_supplier_print_spec" ("view_id") WHERE deleted_at IS NULL;`
    )

    // mc_product_asset — new table
    this.addSql(
      `create table if not exists "mc_product_asset" (
        "id" text not null,
        "store_id" text not null,
        "product_id" text null,
        "ai_job_id" text null,
        "supplier_id" text null,
        "supplier_material_id" text null,
        "supplier_material_name" text null,
        "supplier_material_url" text null,
        "asset_type" text check ("asset_type" in ('design', 'print_file', 'supplier_material', 'supplier_mockup')) not null,
        "url" text null,
        "file_format" text null,
        "width" integer null,
        "height" integer null,
        "dpi" integer null,
        "view_id" text null,
        "design_type" integer not null default 1,
        "metadata_json" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mc_product_asset_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_asset_store_id" ON "mc_product_asset" ("store_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_asset_product_id" ON "mc_product_asset" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_asset_ai_job_id" ON "mc_product_asset" ("ai_job_id") WHERE deleted_at IS NULL;`
    )

    // mc_product — Phase 2B fields
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "basic_product_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "supplier_material_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "supplier_size_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "supplier_color_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "view_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "design_type" integer not null default 1;`
    )
  }

  override async down(): Promise<void> {
    // mc_product rollback
    this.addSql(`alter table if exists "mc_product" drop column if exists "design_type";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "view_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "supplier_color_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "supplier_size_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "supplier_material_id";`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "basic_product_id";`)

    // mc_product_asset rollback
    this.addSql(`drop table if exists "mc_product_asset" cascade;`)

    // mc_supplier_print_spec rollback
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "tip_level";`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "design_type";`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "design_area_unit";`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "design_area_height";`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "design_area_width";`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "view_en_name";`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "view_name";`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "view_id";`)
    this.addSql(`alter table if exists "mc_supplier_print_spec" drop column if exists "basic_product_id";`)

    // mc_supplier_product_variant rollback
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "height";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "width";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "length";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "weight";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "color_name";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "size_name";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "supplier_color_id";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "supplier_size_id";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "supplier_variant_code";`)
    this.addSql(`alter table if exists "mc_supplier_product_variant" drop column if exists "basic_product_id";`)

    // mc_supplier_product rollback
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "deliver_goods_text";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "warehouse_name";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "produce_country";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "supplier_mockup_image_url";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "product_show_master_image";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "supplier_product_name";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "supplier_product_code";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "purchase_price";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "basic_product_en_name";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "basic_product_name";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "basic_product_code";`)
    this.addSql(`alter table if exists "mc_supplier_product" drop column if exists "basic_product_id";`)

    // mc_supplier rollback
    this.addSql(`alter table if exists "mc_supplier" drop column if exists "test_api_base_url";`)
    this.addSql(`alter table if exists "mc_supplier" drop column if exists "api_base_url";`)
  }
}
