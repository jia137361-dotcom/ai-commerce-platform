import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260624000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_store_message" (
        "id" text not null,
        "store_id" text not null,
        "customer_id" text not null,
        "customer_email" text not null,
        "customer_name" text null,
        "order_id" text null,
        "sender_role" text check ("sender_role" in ('buyer', 'seller')) not null,
        "body" text not null,
        "read_by_buyer_at" timestamptz null,
        "read_by_seller_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mc_store_message_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_store_message_store_customer" ON "mc_store_message" ("store_id", "customer_id", "created_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_store_message" cascade;`)
  }
}
