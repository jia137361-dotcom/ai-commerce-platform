import { Migration } from "@mikro-orm/migrations"

export class Migration20260727000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "store_coupon" (
      "id" text not null,
      "store_id" text not null,
      "code" text not null,
      "title" text not null,
      "description" text null,
      "coupon_type" text not null default 'goods_voucher',
      "discount_amount" real not null,
      "min_subtotal" real not null default 0,
      "scope" text not null default 'all_store',
      "product_ids" jsonb null,
      "starts_at" timestamptz null,
      "ends_at" timestamptz null,
      "status" text check ("status" in ('active','archived')) not null default 'active',
      "is_default" boolean not null default false,
      "grant_quantity" integer not null default 1,
      "max_claims" integer null,
      "claim_count" integer not null default 0,
      "metadata" jsonb null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "store_coupon_pkey" primary key ("id")
    );`)
    this.addSql(
      `create unique index if not exists "IDX_store_coupon_store_code" on "store_coupon" ("store_id", "code") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_store_coupon_store_status" on "store_coupon" ("store_id", "status") where "deleted_at" is null;`
    )

    this.addSql(`create table if not exists "buyer_coupon" (
      "id" text not null,
      "store_id" text not null,
      "customer_id" text not null,
      "coupon_id" text not null,
      "status" text check ("status" in ('available','reserved','used','expired')) not null default 'available',
      "quantity" integer not null default 1,
      "expires_at" timestamptz null,
      "claimed_at" timestamptz not null,
      "reserved_cart_id" text null,
      "used_at" timestamptz null,
      "used_order_id" text null,
      "metadata" jsonb null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "buyer_coupon_pkey" primary key ("id")
    );`)
    this.addSql(
      `create index if not exists "IDX_buyer_coupon_customer_store" on "buyer_coupon" ("customer_id", "store_id", "status") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_buyer_coupon_coupon" on "buyer_coupon" ("coupon_id") where "deleted_at" is null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "buyer_coupon" cascade;')
    this.addSql('drop table if exists "store_coupon" cascade;')
  }
}
