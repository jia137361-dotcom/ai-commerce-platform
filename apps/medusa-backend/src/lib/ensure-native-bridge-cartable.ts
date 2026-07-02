import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/core-flows"
import { resolveDefaultSalesChannelId } from "./resolve-default-sales-channel"

const DEFAULT_STOCK_LOCATION_NAME = "Store Core Default Warehouse"

type QueryGraph = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data: Array<Record<string, unknown>> }>
}

async function queryFirst(
  query: QueryGraph,
  entity: string,
  filters: Record<string, unknown>,
  fields: string[]
) {
  const { data } = await query.graph({ entity, filters, fields })
  return data[0] ?? null
}

export async function ensureDefaultSalesChannelStockLocation(container: MedusaContainer) {
  const salesChannelId = await resolveDefaultSalesChannelId(container)
  if (!salesChannelId) {
    return null
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph

  const existingLink = await queryFirst(
    query,
    "sales_channel_location",
    { sales_channel_id: salesChannelId },
    ["id", "stock_location_id", "sales_channel_id"]
  )
  if (existingLink?.id) {
    return {
      salesChannelId,
      stockLocationId: String(existingLink.stock_location_id),
    }
  }

  let location = await queryFirst(
    query,
    "stock_location",
    { name: DEFAULT_STOCK_LOCATION_NAME },
    ["id", "name"]
  )
  if (!location?.id) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{ name: DEFAULT_STOCK_LOCATION_NAME }],
      },
    })
    location = result[0] as Record<string, unknown>
  }

  if (!location?.id) {
    throw new Error("Unable to resolve default stock location for cart checkout")
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: String(location.id),
      add: [salesChannelId],
      remove: [],
    },
  })

  return {
    salesChannelId,
    stockLocationId: String(location.id),
  }
}

export async function linkNativeProductToDefaultSalesChannel(
  container: MedusaContainer,
  medusaProductId: string
) {
  const salesChannelId = await resolveDefaultSalesChannelId(container)
  if (!salesChannelId) {
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const existing = await queryFirst(
    query,
    "product_sales_channel",
    { product_id: medusaProductId, sales_channel_id: salesChannelId },
    ["id", "product_id", "sales_channel_id"]
  )
  if (existing?.id) {
    return
  }

  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK) as {
    create: (links: Array<Record<string, Record<string, string>>>) => Promise<unknown>
  }

  await remoteLink.create([
    {
      [Modules.PRODUCT]: { product_id: medusaProductId },
      [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannelId },
    },
  ])
}

export async function ensureNativeBridgeCartable(
  container: MedusaContainer,
  bridge: { medusaProductId: string; medusaVariantId: string }
) {
  await ensureDefaultSalesChannelStockLocation(container)
  await linkNativeProductToDefaultSalesChannel(container, bridge.medusaProductId)
}
