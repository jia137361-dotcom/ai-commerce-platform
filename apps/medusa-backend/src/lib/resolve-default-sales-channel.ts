import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type StoreRow = {
  default_sales_channel_id?: string | null
}

type SalesChannelRow = {
  id?: string
  is_disabled?: boolean
}

export async function resolveDefaultSalesChannelId(
  container: MedusaContainer
): Promise<string | undefined> {
  const storeModule = container.resolve(Modules.STORE)
  const stores = (await storeModule.listStores(
    {},
    { select: ["id", "default_sales_channel_id"], take: 1 }
  )) as StoreRow[]
  const defaultSalesChannelId = stores[0]?.default_sales_channel_id

  if (defaultSalesChannelId) {
    return defaultSalesChannelId
  }

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const salesChannels = (await salesChannelModule.listSalesChannels(
    {},
    { select: ["id", "is_disabled"], take: 10 }
  )) as SalesChannelRow[]

  return salesChannels.find((channel) => !channel.is_disabled)?.id
}
