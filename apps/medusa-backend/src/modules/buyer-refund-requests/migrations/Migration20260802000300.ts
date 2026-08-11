import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260802000300 extends Migration {
  override async up(): Promise<void> {
    // Medusa DML generates a JSONB raw companion for every model.bigNumber().
    this.addSql(`alter table "buyer_refund_request" add column if not exists "raw_requested_amount" jsonb null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "raw_eligible_amount" jsonb null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "raw_approved_amount" jsonb null;`)

    this.addSql(`update "buyer_refund_request" set "raw_requested_amount" = jsonb_build_object('value', "requested_amount"::text, 'precision', 20) where "raw_requested_amount" is null;`)
    this.addSql(`update "buyer_refund_request" set "raw_eligible_amount" = jsonb_build_object('value', "eligible_amount"::text, 'precision', 20) where "eligible_amount" is not null and "raw_eligible_amount" is null;`)
    this.addSql(`update "buyer_refund_request" set "raw_approved_amount" = jsonb_build_object('value', "approved_amount"::text, 'precision', 20) where "approved_amount" is not null and "raw_approved_amount" is null;`)

    this.addSql(`alter table "buyer_refund_request" alter column "raw_requested_amount" set not null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "buyer_refund_request" drop column if exists "raw_approved_amount";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "raw_eligible_amount";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "raw_requested_amount";`)
  }
}
