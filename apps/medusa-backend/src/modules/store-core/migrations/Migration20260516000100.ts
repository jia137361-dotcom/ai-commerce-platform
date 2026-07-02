import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260516000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "medusa_product_id" text null;`
    )
    this.addSql(
      `alter table if exists "mc_product" add column if not exists "medusa_variant_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_medusa_variant_id" ON "mc_product" ("medusa_variant_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_mc_product_medusa_variant_id";`)
    this.addSql(
      `alter table if exists "mc_product" drop column if exists "medusa_variant_id";`
    )
    this.addSql(
      `alter table if exists "mc_product" drop column if exists "medusa_product_id";`
    )
  }
}
