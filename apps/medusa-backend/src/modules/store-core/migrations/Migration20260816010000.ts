import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260816010000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" add column if not exists "request_id" text null;`)
    this.addSql(`create unique index if not exists "IDX_mc_buyer_wallet_withdrawal_request" on "mc_buyer_wallet_withdrawal" ("store_id", "customer_id", "request_id") where "request_id" is not null and "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_mc_buyer_wallet_withdrawal_request";`)
    this.addSql(`alter table "mc_buyer_wallet_withdrawal" drop column if exists "request_id";`)
  }
}
