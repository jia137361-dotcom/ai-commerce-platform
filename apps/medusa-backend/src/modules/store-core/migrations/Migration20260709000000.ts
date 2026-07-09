import { Migration } from "@mikro-orm/migrations"

export class Migration20260709000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mc_product_favorite" (
        "id" text NOT NULL,
        "store_id" text NOT NULL,
        "product_id" text NOT NULL,
        "customer_id" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "mc_product_favorite_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mc_product_favorite_unique" 
      ON "mc_product_favorite" ("store_id", "product_id", "customer_id");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mc_product_favorite_customer" 
      ON "mc_product_favorite" ("customer_id");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mc_product_favorite_product" 
      ON "mc_product_favorite" ("product_id");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "mc_product_favorite";`)
  }
}
