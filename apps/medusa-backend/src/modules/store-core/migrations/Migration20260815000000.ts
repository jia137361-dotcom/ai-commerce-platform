import { Migration } from "@mikro-orm/migrations"

export class Migration20260815000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "mc_store_notification" drop constraint if exists "mc_store_notification_type_check";')
    this.addSql('alter table "mc_store_notification" add constraint "mc_store_notification_type_check" check ("type" in (\'ai_complete\', \'ai_failed\', \'order_paid\', \'fulfillment_failed\', \'refund_request\'));')
  }

  override async down(): Promise<void> {
    this.addSql('alter table "mc_store_notification" drop constraint if exists "mc_store_notification_type_check";')
    this.addSql('alter table "mc_store_notification" add constraint "mc_store_notification_type_check" check ("type" in (\'ai_complete\', \'ai_failed\', \'order_paid\', \'fulfillment_failed\'));')
  }
}
