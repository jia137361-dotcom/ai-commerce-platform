import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260615000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_ai_generation_job" (
        "id" text not null,
        "store_id" text not null,
        "status" text check ("status" in ('queued', 'running', 'complete', 'failed')) not null default 'queued',
        "progress" integer not null default 0,
        "current_step" text null,
        "estimated_seconds" integer null,
        "payload" jsonb not null,
        "result" jsonb null,
        "error" text null,
        "product_id" text null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mc_ai_generation_job_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_ai_generation_job_store_status" ON "mc_ai_generation_job" ("store_id", "status") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mc_store_notification" (
        "id" text not null,
        "store_id" text not null,
        "type" text check ("type" in ('ai_complete', 'ai_failed', 'order_paid', 'fulfillment_failed')) not null,
        "title" text not null,
        "body" text null,
        "read_at" timestamptz null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mc_store_notification_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_store_notification_store_read" ON "mc_store_notification" ("store_id", "read_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_store_notification" cascade;`)
    this.addSql(`drop table if exists "mc_ai_generation_job" cascade;`)
  }
}
