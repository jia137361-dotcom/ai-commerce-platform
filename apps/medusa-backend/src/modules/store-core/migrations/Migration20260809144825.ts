import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260809144825 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mc_product_favorite" ("id" text not null, "store_id" text not null, "product_id" text not null, "customer_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_product_favorite_pkey" primary key ("id"));`);
    this.addSql(`alter table if exists "mc_product_favorite" add column if not exists "updated_at" timestamptz not null default now(), add column if not exists "deleted_at" timestamptz null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mc_product_favorite_deleted_at" ON "mc_product_favorite" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "mc_product" add column if not exists "ship_from_country" text null;`);

    this.addSql(`alter table if exists "mc_product_category" add column if not exists "supplier_category_id" text null, add column if not exists "level" integer not null default 1;`);

    this.addSql(`alter table if exists "mc_supplier" add column if not exists "adapter_type" text not null default 's2bdiy', add column if not exists "ship_from_country" text null, add column if not exists "ship_to_regions" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_product_favorite" cascade;`);

    this.addSql(`alter table if exists "mc_product" drop column if exists "ship_from_country";`);

    this.addSql(`alter table if exists "mc_product_category" drop column if exists "supplier_category_id", drop column if exists "level";`);

    this.addSql(`alter table if exists "mc_supplier" drop column if exists "adapter_type", drop column if exists "ship_from_country", drop column if exists "ship_to_regions";`);
  }

}
