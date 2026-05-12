import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260512091819 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_product_category" ("id" text not null, "store_id" text not null, "name" text not null, "slug" text not null, "description" text null, "parent_id" text null, "sort_order" real not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_product_category_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_category_deleted_at" ON "mc_product_category" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_category_store_id" ON "mc_product_category" ("store_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "mc_product" add column if not exists "category_ids" text[] null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_product_category" cascade;`)
    this.addSql(`alter table if exists "mc_product" drop column if exists "category_ids";`)
  }
}
