import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260730000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "checkout_payment_attempt" (
      "id" text not null,
      "cart_id" text not null,
      "store_id" text not null,
      "customer_id" text null,
      "provider_id" text not null,
      "payment_collection_id" text null,
      "payment_session_id" text null,
      "provider_payment_id" text null,
      "completed_order_id" text null,
      "status" text check ("status" in ('created','awaiting_payment','requires_action','payment_failed','payment_processing','payment_succeeded','order_completion_failed','completed','expired','cancelled')) not null default 'created',
      "expires_at" timestamptz not null,
      "last_error" text null,
      "metadata" jsonb null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "checkout_payment_attempt_pkey" primary key ("id")
    );`)
    this.addSql(`create index if not exists "IDX_checkout_payment_attempt_deleted_at" on "checkout_payment_attempt" ("deleted_at") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_checkout_payment_attempt_cart_store" on "checkout_payment_attempt" ("cart_id", "store_id") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_checkout_payment_attempt_customer_store" on "checkout_payment_attempt" ("customer_id", "store_id") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_checkout_payment_attempt_collection" on "checkout_payment_attempt" ("payment_collection_id") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_checkout_payment_attempt_session" on "checkout_payment_attempt" ("payment_session_id") where deleted_at is null;`)
    this.addSql(`create unique index if not exists "IDX_checkout_payment_attempt_active_cart" on "checkout_payment_attempt" ("cart_id") where "deleted_at" is null and "status" in ('created','awaiting_payment','requires_action','payment_failed','payment_processing','payment_succeeded','order_completion_failed');`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "checkout_payment_attempt" cascade;`)
  }
}
