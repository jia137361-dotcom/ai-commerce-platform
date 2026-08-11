import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create unique index if not exists "IDX_processed_webhook_event_dedupe_unique" on "processed_webhook_event" ("dedupe_key") where "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_processed_webhook_event_dedupe_unique";`)
  }
}
