import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createLocationFulfillmentSetWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/core-flows"
import { MARKET_REGION_DEFINITIONS } from "../lib/product-regions"
import { resolveDefaultSalesChannelId } from "../lib/resolve-default-sales-channel"

const LOCATION_NAME = "Store Core Default Warehouse"
const FULFILLMENT_SET_NAME = "Citigoo Market Fulfillment"
const SHIPPING_PROVIDER_ID = "manual_manual"

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

export default async function bootstrapMarketShipping({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK) as {
    create: (links: Array<Record<string, Record<string, string>>>) => Promise<unknown>
  }
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as {
    listShippingOptions: (filters: Record<string, unknown>) => Promise<Array<{ id?: string; name?: string }>>
  }

  const salesChannelId = await resolveDefaultSalesChannelId(container)
  if (!salesChannelId) {
    throw new Error("Default sales channel is required for market shipping bootstrap")
  }

  const defaultProfile = await queryFirst(query, "shipping_profile", { type: "default" }, ["id", "name"])
  const shippingProfileId = typeof defaultProfile?.id === "string" ? defaultProfile.id : null
  if (!shippingProfileId) {
    throw new Error("Default shipping profile is required for market shipping bootstrap")
  }

  let location = await queryFirst(query, "stock_location", { name: LOCATION_NAME }, ["id", "name"])
  if (!location?.id) {
    location = (await queryFirst(query, "stock_location", {}, ["id", "name"])) ?? null
  }
  if (!location?.id) {
    throw new Error(`Stock location "${LOCATION_NAME}" was not found`)
  }

  const salesChannelLocationLink = await queryFirst(
    query,
    "sales_channel_location",
    {
      stock_location_id: String(location.id),
      sales_channel_id: salesChannelId,
    },
    ["id"]
  )
  if (!salesChannelLocationLink?.id) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: String(location.id),
        add: [salesChannelId],
        remove: [],
      },
    })
  }

  const providerLink = await queryFirst(
    query,
    "location_fulfillment_provider",
    {
      stock_location_id: String(location.id),
      fulfillment_provider_id: SHIPPING_PROVIDER_ID,
    },
    ["id"]
  )
  if (!providerLink?.id) {
    await remoteLink.create([
      {
        [Modules.STOCK_LOCATION]: { stock_location_id: String(location.id) },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: SHIPPING_PROVIDER_ID },
      },
    ])
  }

  let fulfillmentSet = await queryFirst(
    query,
    "fulfillment_set",
    { name: FULFILLMENT_SET_NAME },
    ["id", "name", "type"]
  )
  if (!fulfillmentSet?.id) {
    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: String(location.id),
        fulfillment_set_data: {
          name: FULFILLMENT_SET_NAME,
          type: "shipping",
        },
      },
    })
    fulfillmentSet = await queryFirst(
      query,
      "fulfillment_set",
      { name: FULFILLMENT_SET_NAME },
      ["id", "name", "type"]
    )
  }
  if (!fulfillmentSet?.id) {
    throw new Error("Unable to create market fulfillment set")
  }

  for (const definition of MARKET_REGION_DEFINITIONS) {
    const zoneName = `Citigoo ${definition.name}`
    let serviceZone = await queryFirst(query, "service_zone", { name: zoneName }, ["id", "name"])
    if (!serviceZone?.id) {
      const { result } = await createServiceZonesWorkflow(container).run({
        input: {
          data: [
            {
              name: zoneName,
              fulfillment_set_id: String(fulfillmentSet.id),
              geo_zones: definition.countries.map((country_code) => ({
                type: "country",
                country_code,
              })),
            },
          ],
        },
      })
      serviceZone = result[0] as unknown as Record<string, unknown>
    }

    const optionName = `${definition.name} Standard Shipping`
    const optionCode = `market-${definition.name.toLowerCase().replace(/\s+/g, "-")}-standard`
    const existingOptions = await fulfillmentModule.listShippingOptions({
      service_zone_id: String(serviceZone.id),
      shipping_profile_id: shippingProfileId,
    })
    let shippingOption = existingOptions[0]
    if (!shippingOption?.id) {
      const amount = definition.currency_code === "cny" ? 2500 : 500
      const { result } = await createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: optionName,
            service_zone_id: String(serviceZone.id),
            shipping_profile_id: shippingProfileId,
            provider_id: SHIPPING_PROVIDER_ID,
            type: {
              label: "Standard",
              description: `Standard shipping for ${definition.name}`,
              code: optionCode,
            },
            price_type: "flat",
            prices: [
              {
                amount,
                currency_code: definition.currency_code,
              },
            ],
          },
        ],
      })
      shippingOption = result[0] as { id?: string; name?: string }
    }

    console.log(
      `MARKET_SHIPPING zone=${definition.name} service_zone=${serviceZone.id} option=${shippingOption?.id ?? "missing"} countries=${definition.countries.join("|")} currency=${definition.currency_code}`
    )
  }
}
