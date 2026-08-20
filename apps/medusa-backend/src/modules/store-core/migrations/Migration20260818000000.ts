import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260818000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mc_referral_profile" ("id" text not null, "store_id" text not null, "customer_id" text not null, "referral_code" text not null, "status" text check ("status" in ('active', 'frozen')) not null default 'active', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_referral_profile_pkey" primary key ("id"));`)
    this.addSql(`create unique index if not exists "IDX_mc_referral_profile_customer" on "mc_referral_profile" ("store_id", "customer_id") where "deleted_at" is null;`)
    this.addSql(`create unique index if not exists "IDX_mc_referral_profile_code" on "mc_referral_profile" ("store_id", "referral_code") where "deleted_at" is null;`)

    this.addSql(`create table if not exists "mc_referral_attribution" ("id" text not null, "store_id" text not null, "referrer_customer_id" text not null, "referred_customer_id" text not null, "referral_code" text not null, "source" text check ("source" in ('link', 'code', 'email', 'admin')) not null default 'code', "status" text check ("status" in ('active', 'expired', 'cancelled')) not null default 'active', "attributed_at" timestamptz not null, "first_successful_order_id" text null, "first_successful_order_at" timestamptz null, "expires_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_referral_attribution_pkey" primary key ("id"));`)
    this.addSql(`create unique index if not exists "IDX_mc_referral_attribution_referred" on "mc_referral_attribution" ("store_id", "referred_customer_id") where "deleted_at" is null;`)
    this.addSql(`create index if not exists "IDX_mc_referral_attribution_referrer" on "mc_referral_attribution" ("store_id", "referrer_customer_id", "status") where "deleted_at" is null;`)

    this.addSql(`create table if not exists "mc_referral_commission" ("id" text not null, "store_id" text not null, "attribution_id" text not null, "referrer_customer_id" text not null, "referred_customer_id" text not null, "order_id" text not null, "order_display_id" integer null, "order_created_at" timestamptz not null, "eligible_amount_minor" integer not null, "commission_amount_minor" integer not null, "currency_code" text not null default 'usd', "rate_bps" integer not null, "is_first_order" boolean not null default false, "status" text check ("status" in ('pending', 'released', 'order_cancelled', 'order_refund', 'cancelled', 'frozen', 'reversed', 'expired')) not null default 'pending', "released_at" timestamptz null, "reason" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_referral_commission_pkey" primary key ("id"));`)
    this.addSql(`create unique index if not exists "IDX_mc_referral_commission_order" on "mc_referral_commission" ("store_id", "order_id") where "deleted_at" is null;`)
    this.addSql(`create index if not exists "IDX_mc_referral_commission_referrer" on "mc_referral_commission" ("store_id", "referrer_customer_id", "status", "order_created_at") where "deleted_at" is null;`)
    this.addSql(`create index if not exists "IDX_mc_referral_commission_attribution" on "mc_referral_commission" ("attribution_id", "order_created_at") where "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_referral_commission" cascade;`)
    this.addSql(`drop table if exists "mc_referral_attribution" cascade;`)
    this.addSql(`drop table if exists "mc_referral_profile" cascade;`)
  }
}
