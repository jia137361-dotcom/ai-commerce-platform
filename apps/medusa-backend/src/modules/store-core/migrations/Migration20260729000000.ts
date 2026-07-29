import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "mc_product_category"
      add column if not exists "supplier_category_id" text null;
    `)
    this.addSql(`
      alter table if exists "mc_product_category"
      add column if not exists "level" real not null default 1;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mc_product_category_supplier_category_id"
      ON "mc_product_category" ("supplier_category_id")
      WHERE deleted_at IS NULL AND supplier_category_id IS NOT NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_mc_product_category_supplier_category_id";`)
    this.addSql(`alter table if exists "mc_product_category" drop column if exists "level";`)
    this.addSql(`alter table if exists "mc_product_category" drop column if exists "supplier_category_id";`)
  }
}
