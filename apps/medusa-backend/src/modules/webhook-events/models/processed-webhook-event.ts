import { model } from "@medusajs/framework/utils"

/** Stripe / payment 侧效果幂等：同一 dedupe_key 只处理一次（可与 Stripe event id 对齐） */
const ProcessedWebhookEvent = model.define("processed_webhook_event", {
  id: model.id().primaryKey(),
  dedupe_key: model.text(),
  event_kind: model.text(),
})

export default ProcessedWebhookEvent
