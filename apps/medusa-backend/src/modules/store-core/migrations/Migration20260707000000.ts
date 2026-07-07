import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260707000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "mc_supplier" add column if not exists "adapter_type" text not null default 's2bdiy';`
    )
    this.addSql(
      `alter table if exists "mc_product_category" add column if not exists "supplier_category_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_category_supplier_category_id" ON "mc_product_category" ("supplier_category_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_mc_product_category_supplier_category_id";`
    )
    this.addSql(
      `alter table if exists "mc_product_category" drop column if exists "supplier_category_id";`
    )
    this.addSql(
      `alter table if exists "mc_supplier" drop column if exists "adapter_type";`
    )
  }
}
