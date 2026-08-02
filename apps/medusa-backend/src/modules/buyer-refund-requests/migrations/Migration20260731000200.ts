import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731000200 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "buyer_refund_request" add column if not exists "eligible_amount" numeric null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "requested_items" jsonb null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "policy_result" text null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "decision_type" text null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "decision_reason" text null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "reviewed_by" text null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "production_status_snapshot" text null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "latest_production_status" text null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "idempotency_key" text null;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "attempt_count" integer not null default 0;`)
    this.addSql(`alter table "buyer_refund_request" add column if not exists "last_provider_error_code" text null;`)
    this.addSql(`alter table "buyer_refund_request" drop constraint if exists "buyer_refund_request_status_check";`)
    this.addSql(`alter table "buyer_refund_request" add constraint "buyer_refund_request_status_check" check ("status" in ('pending','requested','auto_review','manual_review','awaiting_information','approved','rejected','processing','refund_processing','partially_refunded','refunded','refund_pending','refund_failed','processed','failed','cancelled'));`)
    this.addSql(`create unique index if not exists "IDX_buyer_refund_request_idempotency" on "buyer_refund_request" ("idempotency_key") where "deleted_at" is null and "idempotency_key" is not null;`)
    this.addSql(`create unique index if not exists "IDX_buyer_refund_request_external_refund" on "buyer_refund_request" ("external_refund_id") where "deleted_at" is null and "external_refund_id" is not null;`)
    this.addSql(`create index if not exists "IDX_buyer_refund_request_store_status" on "buyer_refund_request" ("store_id", "status") where "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_buyer_refund_request_idempotency";`)
    this.addSql(`drop index if exists "IDX_buyer_refund_request_external_refund";`)
    this.addSql(`drop index if exists "IDX_buyer_refund_request_store_status";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "eligible_amount";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "requested_items";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "policy_result";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "decision_type";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "decision_reason";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "reviewed_by";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "production_status_snapshot";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "latest_production_status";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "idempotency_key";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "attempt_count";`)
    this.addSql(`alter table "buyer_refund_request" drop column if exists "last_provider_error_code";`)
  }
}
