import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { releaseReferralCommissionForOrder } from "../lib/referral-program"

export default async function reconcileReferralCommissionsJob(container: MedusaContainer) {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService & {
    listReferralCommissions: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<Array<{ order_id: string }>>
  }
  const pending = await storeCore.listReferralCommissions(
    { status: "pending" },
    { take: 500, order: { order_created_at: "ASC" } }
  )
  let reconciled = 0
  for (const commission of pending) {
    try {
      await releaseReferralCommissionForOrder(container, commission.order_id)
      reconciled += 1
    } catch (error) {
      console.error("[reconcile-referral-commissions] failed:", {
        order_id: commission.order_id,
        message: error instanceof Error ? error.message : "unknown",
      })
    }
  }
  const logger = container.resolve("logger") as { info: (message: string) => void }
  logger.info(`Reconciled ${reconciled} referral commissions`)
}

export const config = {
  name: "reconcile-referral-commissions",
  schedule: "15 * * * *",
}
