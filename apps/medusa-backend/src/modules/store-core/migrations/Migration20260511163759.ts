import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260511163759 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "domain_binding" ("id" text not null, "store_id" text not null, "domain" text not null, "status" text check ("status" in ('pending', 'verified', 'active', 'failed')) not null default 'pending', "ssl_status" text null, "verified_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "domain_binding_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_domain_binding_deleted_at" ON "domain_binding" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "mc_store" ("id" text not null, "owner_user_id" text null, "name" text not null, "slug" text not null, "logo_url" text null, "banner_url" text null, "description" text null, "seo_title" text null, "seo_description" text null, "status" text check ("status" in ('draft', 'active', 'suspended', 'archived')) not null default 'active', "stripe_account_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mc_store_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mc_store_deleted_at" ON "mc_store" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_member" ("id" text not null, "store_id" text not null, "user_id" text not null, "role" text check ("role" in ('owner', 'admin', 'designer', 'operator', 'viewer')) not null default 'owner', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_member_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_member_deleted_at" ON "store_member" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_setting" ("id" text not null, "store_id" text not null, "brand_name" text null, "logo_url" text null, "support_email" text null, "seo_title" text null, "seo_description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_setting_deleted_at" ON "store_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "domain_binding" cascade;`);

    this.addSql(`drop table if exists "mc_store" cascade;`);

    this.addSql(`drop table if exists "store_member" cascade;`);

    this.addSql(`drop table if exists "store_setting" cascade;`);
  }

}
