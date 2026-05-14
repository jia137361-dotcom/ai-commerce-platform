import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260511165335 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_product" ("id" text not null, "store_id" text not null, "title" text not null, "description" text null, "status" text check ("status" in ('draft', 'published', 'unpublished', 'archived')) not null default 'draft', "source" text check ("source" in ('manual', 'ai')) not null default 'manual', "ai_job_id" text null, "prompt" text null, "design_image_url" text null, "image_url" text null, "tags" text[] null, "price" real null, "variants" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_product_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_deleted_at" ON "mc_product" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_store_id" ON "mc_product" ("store_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_product_store_status" ON "mc_product" ("store_id", "status") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_product" cascade;`)
  }
}
