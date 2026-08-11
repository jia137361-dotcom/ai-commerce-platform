import { Migration } from "@mikro-orm/migrations"

/**
 * Ship From / Ship To logistics fields for products and suppliers.
 * Idempotent so production hotfixes that already applied columns can re-run safely.
 */
export class Migration20260720000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      alter table if exists "mc_product"
      add column if not exists "ship_from_country" text null;
    `)
    this.addSql(`
      alter table if exists "mc_supplier"
      add column if not exists "ship_from_country" text null;
    `)
    this.addSql(`
      alter table if exists "mc_supplier"
      add column if not exists "ship_to_regions" jsonb null;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mc_product_ship_from_country"
      ON "mc_product" ("ship_from_country")
      WHERE deleted_at IS NULL AND ship_from_country IS NOT NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_mc_product_ship_from_country";`)
    this.addSql(`
      alter table if exists "mc_product"
      drop column if exists "ship_from_country";
    `)
    this.addSql(`
      alter table if exists "mc_supplier"
      drop column if exists "ship_to_regions";
    `)
    this.addSql(`
      alter table if exists "mc_supplier"
      drop column if exists "ship_from_country";
    `)
  }
}
