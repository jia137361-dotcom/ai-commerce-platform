import type { MedusaContainer } from "@medusajs/framework/types"
import { processMonthlyBuyerWithdrawals } from "../lib/buyer-wallet"

export default async function processMonthlyBuyerWithdrawalsJob(container: MedusaContainer) {
  const logger = container.resolve("logger") as { info: (message: string) => void }
  const result = await processMonthlyBuyerWithdrawals(container)
  if (result.processed > 0) logger.info(`Processed ${result.processed} approved PayPal withdrawals`)
}

export const config = {
  name: "process-monthly-buyer-withdrawals",
  schedule: "*/15 * * * *",
}
