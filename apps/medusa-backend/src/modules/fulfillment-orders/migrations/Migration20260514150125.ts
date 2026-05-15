import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514150125 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "fulfillment_order" ("id" text not null, "order_id" text not null, "store_id" text not null, "payment_collection_id" text null, "supplier" text not null default 'mock', "supplier_order_id" text null, "payload" jsonb null, "pushed_at" timestamptz null, "failed_reason" text null, "status" text check ("status" in ('pending_capture', 'waiting', 'pushed', 'fulfilled', 'failed', 'canceled')) not null default 'pending_capture', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "fulfillment_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_fulfillment_order_deleted_at" ON "fulfillment_order" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "fulfillment_order" cascade;`);
  }

}
