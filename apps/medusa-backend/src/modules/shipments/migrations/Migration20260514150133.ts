import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514150133 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shipment" ("id" text not null, "store_id" text not null, "order_id" text not null, "fulfillment_order_id" text not null, "carrier" text null, "tracking_number" text null, "tracking_url" text null, "shipped_at" timestamptz null, "delivered_at" timestamptz null, "status" text check ("status" in ('pending', 'shipped', 'delivered')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_deleted_at" ON "shipment" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipment" cascade;`);
  }

}
