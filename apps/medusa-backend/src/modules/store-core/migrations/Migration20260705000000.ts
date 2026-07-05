import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260705000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mc_warehouse_region" (
        "id" text not null,
        "code" text not null,
        "name_en" text not null,
        "name_zh" text not null,
        "country_code" text null,
        "s2bdiy_count" integer null,
        "enabled" boolean not null default true,
        "notes" text null,
        "sort_order" integer not null default 0,
        "raw_json" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mc_warehouse_region_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mc_warehouse_region_code" ON "mc_warehouse_region" ("code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_warehouse_region_enabled" ON "mc_warehouse_region" ("enabled", "sort_order") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mc_ship_to_region" (
        "id" text not null,
        "zone" text not null,
        "country_region_en" text not null,
        "country_region_zh" text not null,
        "country_code" text not null,
        "phone_code" text null,
        "abbreviation" text not null,
        "enabled" boolean not null default true,
        "blocked" boolean not null default false,
        "blocked_reason" text null,
        "sort_order" integer not null default 0,
        "raw_json" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mc_ship_to_region_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mc_ship_to_region_country_code" ON "mc_ship_to_region" ("country_code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mc_ship_to_region_available" ON "mc_ship_to_region" ("enabled", "blocked", "sort_order") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mc_ship_to_region" cascade;`)
    this.addSql(`drop table if exists "mc_warehouse_region" cascade;`)
  }
}
