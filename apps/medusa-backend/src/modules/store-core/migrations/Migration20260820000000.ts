import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260820000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_mc_referral_attribution_referred";`)
    this.addSql(`create unique index if not exists "IDX_mc_referral_attribution_active_referred" on "mc_referral_attribution" ("store_id", "referred_customer_id") where "status" = 'active' and "deleted_at" is null;`)
    this.addSql(`create table if not exists "mc_referral_program_setting" ("id" text not null, "store_id" text not null, "first_order_rate_bps" integer not null default 2500, "future_order_rate_bps" integer not null default 800, "attribution_months" integer not null default 12, "currency_code" text not null default 'usd', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_referral_program_setting_pkey" primary key ("id"));`)
    this.addSql(`create unique index if not exists "IDX_mc_referral_program_setting_store" on "mc_referral_program_setting" ("store_id") where "deleted_at" is null;`)

    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "fee_minor" integer null;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "payout_amount_minor" integer null;`)
    this.addSql(`update "mc_buyer_wallet_withdrawal" set "payout_amount_minor" = "amount_minor" where "payout_amount_minor" is null;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" alter column "payout_amount_minor" set not null;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "provider_fee_minor" integer null;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "failure_kind" text null;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "retry_count" integer not null default 0;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "approved_at" timestamptz null;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "processing_at" timestamptz null;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "paid_at" timestamptz null;`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "rejected_at" timestamptz null;`)
    this.addSql(`do $$ declare constraint_name text; begin for constraint_name in select conname from pg_constraint where conrelid = 'mc_buyer_wallet_withdrawal'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%' loop execute format('alter table "mc_buyer_wallet_withdrawal" drop constraint %I', constraint_name); end loop; end $$;`)
    this.addSql(`update "mc_buyer_wallet_withdrawal" set "status" = 'rejected' where "status" = 'cancelled';`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add constraint "mc_buyer_wallet_withdrawal_status_check" check ("status" in ('pending', 'approved', 'processing', 'paid', 'failed', 'rejected'));`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add constraint "mc_buyer_wallet_withdrawal_failure_kind_check" check ("failure_kind" is null or "failure_kind" in ('platform', 'recipient', 'unknown'));`)
    this.addSql(`create index if not exists "IDX_mc_buyer_wallet_withdrawal_settlement" on "mc_buyer_wallet_withdrawal" ("status", "approved_at") where "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_mc_buyer_wallet_withdrawal_settlement";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop constraint if exists "mc_buyer_wallet_withdrawal_failure_kind_check";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop constraint if exists "mc_buyer_wallet_withdrawal_status_check";`)
    this.addSql(`update "mc_buyer_wallet_withdrawal" set "status" = 'cancelled' where "status" in ('pending', 'approved', 'rejected');`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add constraint "mc_buyer_wallet_withdrawal_status_check" check ("status" in ('processing', 'paid', 'failed', 'cancelled'));`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "rejected_at";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "paid_at";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "processing_at";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "approved_at";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "retry_count";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "failure_kind";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "provider_fee_minor";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "payout_amount_minor";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "fee_minor";`)
    this.addSql(`drop table if exists "mc_referral_program_setting" cascade;`)
    this.addSql(`drop index if exists "IDX_mc_referral_attribution_active_referred";`)
    this.addSql(`create unique index if not exists "IDX_mc_referral_attribution_referred" on "mc_referral_attribution" ("store_id", "referred_customer_id") where "deleted_at" is null;`)
  }
}
