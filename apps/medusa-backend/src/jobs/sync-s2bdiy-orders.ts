import type { MedusaContainer } from "@medusajs/framework/types"
import { syncPendingSupplierOrders } from "../lib/s2bdiy/sync-supplier-orders"

export default async function syncS2bdiyOrdersJob(container: MedusaContainer) {
  const count = await syncPendingSupplierOrders(container)
  const logger = container.resolve("logger") as { info: (msg: string) => void }
  logger.info(`S2BDIY sync job finished: ${count} orders synced`)
}

export const config = {
  name: "sync-s2bdiy-supplier-orders",
  schedule: "*/5 * * * *",
}
