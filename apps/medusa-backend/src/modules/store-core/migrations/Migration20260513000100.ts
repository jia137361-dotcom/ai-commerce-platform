import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260513000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_platform_product" ("id" text not null, "title" text not null, "category" text not null, "description" text null, "base_cost" real not null default 0, "supplier" text null, "supplier_product_id" text null, "available_colors" text[] null, "available_sizes" text[] null, "print_area" jsonb null, "status" text check ("status" in ('active', 'inactive', 'archived')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_platform_product_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_platform_product_deleted_at" ON "mc_platform_product" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_platform_product_status" ON "mc_platform_product" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "mc_product" add column if not exists "platform_product_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "supplier_product_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "cost" real null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_platform_product_id" ON "mc_product" ("platform_product_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_platform_product" cascade;`)
    this.addSql(
      `drop index if exists "IDX_mc_product_platform_product_id";`
    )
    this.addSql(
      `alter table if exists "mc_product" drop column if exists "platform_product_id";`
    )
    this.addSql(
      `alter table if exists "mc_product" drop column if exists "supplier_product_id";`
    )
    this.addSql(`alter table if exists "mc_product" drop column if exists "cost";`)
  }
}
