import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Dev2: supplier order tables only (catalog/product columns belong to Dev1). */
export class Migration20260524100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_supplier_order" ("id" text not null, "store_id" text not null, "order_id" text not null, "supplier_id" text not null, "supplier_order_id" text null, "third_order_id" text not null, "platform" integer not null default 99, "logistics_id" text null, "logistics_name" text null, "product_amount" real null, "shipping_amount" real null, "total_amount" real null, "supplier_status" text not null default 'not_pushed', "supplier_status_text" text null, "supplier_pay_status" text not null default 'payment_pending', "supplier_pay_status_text" text null, "tracking_number" text null, "tracking_url" text null, "waybill_url" text null, "raw_request_json" jsonb null, "raw_response_json" jsonb null, "last_synced_at" timestamptz null, "error_message" text null, "pay_retry_count" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_supplier_order_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_order_order_id" ON "mc_supplier_order" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_order_supplier_status" ON "mc_supplier_order" ("supplier_status") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mc_supplier_order_item" ("id" text not null, "supplier_order_id" text not null, "order_item_id" text null, "third_item_id" text null, "basic_product_id" text null, "supplier_product_id" text null, "supplier_product_name" text null, "supplier_size_id" text null, "supplier_color_id" text null, "supplier_size_name" text null, "supplier_color_name" text null, "show_image" text null, "quantity" integer not null default 1, "product_amount" real null, "total_amount" real null, "total_weight" real null, "raw_json" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_supplier_order_item_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_supplier_order_item_supplier_order_id" ON "mc_supplier_order_item" ("supplier_order_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_supplier_order_item" cascade;`)
    this.addSql(`drop table if exists "mc_supplier_order" cascade;`)
  }
}
