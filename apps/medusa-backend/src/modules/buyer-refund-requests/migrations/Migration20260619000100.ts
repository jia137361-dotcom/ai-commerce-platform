import { Migration } from "@mikro-orm/migrations"

export class Migration20260619000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "buyer_refund_request" (
      "id" text not null,
      "order_id" text not null,
      "display_id" integer null,
      "customer_id" text not null,
      "store_id" text not null,
      "currency_code" text not null,
      "requested_amount" numeric not null,
      "approved_amount" numeric null,
      "reason" text not null,
      "note" text null,
      "status" text check ("status" in ('pending','approved','rejected','processing','processed','failed','cancelled')) not null default 'pending',
      "payment_provider_id" text null,
      "external_payment_id" text null,
      "external_refund_id" text null,
      "external_transaction_id" text null,
      "provider_status" text null,
      "provider_payload" jsonb null,
      "reviewed_at" timestamptz null,
      "processed_at" timestamptz null,
      "failed_at" timestamptz null,
      "failure_reason" text null,
      "metadata" jsonb null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "buyer_refund_request_pkey" primary key ("id")
    );`)
    this.addSql(`create index if not exists "IDX_buyer_refund_request_order" on "buyer_refund_request" ("order_id") where "deleted_at" is null;`)
    this.addSql(`create index if not exists "IDX_buyer_refund_request_customer_store" on "buyer_refund_request" ("customer_id", "store_id") where "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "buyer_refund_request" cascade;')
  }
}
