import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260704000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "platform_operator" (
        "id" text not null,
        "user_id" text not null,
        "role" text check ("role" in ('admin', 'viewer')) not null default 'admin',
        "status" text check ("status" in ('active', 'disabled')) not null default 'active',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "platform_operator_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_platform_operator_user_id" ON "platform_operator" ("user_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "platform_audit_event" (
        "id" text not null,
        "actor_user_id" text null,
        "action" text not null,
        "entity_type" text not null,
        "entity_id" text null,
        "store_id" text null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "platform_audit_event_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_platform_audit_event_created_at" ON "platform_audit_event" ("created_at" DESC) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "platform_audit_event" cascade;`)
    this.addSql(`drop table if exists "platform_operator" cascade;`)
  }
}
