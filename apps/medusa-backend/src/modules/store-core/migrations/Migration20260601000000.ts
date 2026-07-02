import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260601000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_product_review" (
        "id" text not null,
        "store_id" text not null,
        "product_id" text not null,
        "order_id" text not null,
        "order_display_id" integer not null,
        "customer_email" text not null,
        "customer_name" text null,
        "rating" integer not null,
        "title" text null,
        "content" text null,
        "status" text check ("status" in ('published', 'hidden')) not null default 'published',
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mc_product_review_pkey" primary key ("id"),
        constraint "CHK_mc_product_review_rating" check ("rating" in (1, 2, 3, 4, 5))
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_review_store_product" ON "mc_product_review" ("store_id", "product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_review_store_order" ON "mc_product_review" ("store_id", "order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mc_product_review_unique_order_product_email" ON "mc_product_review" ("store_id", "product_id", "order_id", "customer_email") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_product_review" cascade;`)
  }
}
