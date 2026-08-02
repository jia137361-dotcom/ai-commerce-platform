import type { MedusaContainer } from "@medusajs/framework/types"
import { WEBHOOK_EVENTS_MODULE } from "../modules/webhook-events"
import type WebhookEventsModuleService from "../modules/webhook-events/service"

/**
 * 尝试登记幂等键；若已存在则返回 false（应跳过业务副作用）。
 * 与 Stripe `evt_` 对齐时，可将 `dedupeKey` 设为该 id；当前 payment.captured 仅有 payment id 时用组合键。
 */
export async function tryRegisterWebhookDedupe(
  container: MedusaContainer,
  dedupeKey: string,
  eventKind: string
): Promise<boolean> {
  const svc = container.resolve(WEBHOOK_EVENTS_MODULE) as WebhookEventsModuleService
  const existing = await svc.listProcessedWebhookEvents({ dedupe_key: [dedupeKey] })
  if (existing.length > 0) {
    return false
  }
  try {
    await svc.createProcessedWebhookEvents({
      dedupe_key: dedupeKey,
      event_kind: eventKind,
    })
    return true
  } catch (error) {
    // The unique index is the concurrency boundary; another instance may win
    // between the read and insert above.
    if (/unique|duplicate/i.test(error instanceof Error ? error.message : String(error))) return false
    throw error
  }
}

export async function releaseWebhookDedupe(
  container: MedusaContainer,
  dedupeKey: string
): Promise<void> {
  const svc = container.resolve(WEBHOOK_EVENTS_MODULE) as WebhookEventsModuleService & {
    deleteProcessedWebhookEvents: (ids: string | string[]) => Promise<unknown>
  }
  const existing = await svc.listProcessedWebhookEvents({ dedupe_key: [dedupeKey] })
  const ids = existing.map((event) => event.id).filter((id): id is string => typeof id === "string")
  if (ids.length) await svc.deleteProcessedWebhookEvents(ids)
}
