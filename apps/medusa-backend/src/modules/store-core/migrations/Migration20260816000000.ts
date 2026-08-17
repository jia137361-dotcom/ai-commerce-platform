import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260816000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mc_buyer_wallet_ledger" ("id" text not null, "store_id" text not null, "customer_id" text not null, "type" text check ("type" in ('cashback_credit', 'withdrawal_debit', 'adjustment')) not null, "amount_minor" integer not null, "currency_code" text not null, "status" text check ("status" in ('available', 'processing', 'completed', 'failed', 'cancelled')) not null, "source" text null, "reference_id" text null, "description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_buyer_wallet_ledger_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_mc_buyer_wallet_ledger_owner" on "mc_buyer_wallet_ledger" ("store_id", "customer_id", "currency_code") where "deleted_at" is null;`)
    this.addSql(`create index if not exists "IDX_mc_buyer_wallet_ledger_reference" on "mc_buyer_wallet_ledger" ("reference_id") where "deleted_at" is null;`)
    this.addSql(`create unique index if not exists "IDX_mc_buyer_wallet_ledger_idempotency" on "mc_buyer_wallet_ledger" ("store_id", "customer_id", "type", "reference_id") where "reference_id" is not null and "deleted_at" is null;`)

    this.addSql(`create table if not exists "mc_buyer_wallet_withdrawal" ("id" text not null, "store_id" text not null, "customer_id" text not null, "amount_minor" integer not null, "currency_code" text not null, "paypal_email" text not null, "status" text check ("status" in ('processing', 'paid', 'failed', 'cancelled')) not null, "provider" text not null default 'paypal', "provider_batch_id" text null, "provider_item_id" text null, "error_message" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_buyer_wallet_withdrawal_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_mc_buyer_wallet_withdrawal_owner" on "mc_buyer_wallet_withdrawal" ("store_id", "customer_id", "created_at") where "deleted_at" is null;`)
    this.addSql(`create unique index if not exists "IDX_mc_buyer_wallet_withdrawal_batch" on "mc_buyer_wallet_withdrawal" ("provider_batch_id") where "provider_batch_id" is not null and "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_buyer_wallet_withdrawal" cascade;`)
    this.addSql(`drop table if exists "mc_buyer_wallet_ledger" cascade;`)
  }
}
