import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createLocationFulfillmentSetWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/core-flows"
import { resolveDefaultSalesChannelId } from "../lib/resolve-default-sales-channel"

const LOCATION_NAME = "Batch 11 Smoke Warehouse"
const FULFILLMENT_SET_NAME = "Batch 11 Smoke Fulfillment"
const SERVICE_ZONE_NAME = "Batch 11 Smoke China"
const SHIPPING_OPTION_NAME = "Batch 11 Smoke Standard CN"
const SHIPPING_OPTION_CODE = "batch11-smoke-standard-cn"
const SHIPPING_PROVIDER_ID = "manual_manual"
const SMOKE_SHIPPING_PROFILE_NAME = "Batch 11 Smoke Shipping Profile"
const SMOKE_VARIANT_ID =
  process.env.BATCH11_SMOKE_VARIANT_ID ?? "variant_01KSNA40DZZ79AW9Z8EHHXPWTX"

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

type SmokeShippingProfileResolution = {
  smoke_variant_id: string
  product_id: string
  resolved_shipping_profile_id: string
  shipping_profile_resolution_source:
    | "query_graph"
    | "remote_link"
    | "existing_default_profile"
    | "created_smoke_profile"
  product_profile_link_status: "existing" | "created" | "reused"
  verified_product_shipping_profile_id: string
}

const readNestedString = (
  row: Record<string, unknown> | null | undefined,
  path: string[]
) => {
  let current: unknown = row
  for (const part of path) {
    if (!current || typeof current !== "object") return null
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" && current.trim() ? current.trim() : null
}

const queryFirstSafe = async (
  query: QueryGraph,
  entity: string,
  filters: Record<string, unknown>,
  fields: string[]
) => {
  try {
    return await queryFirst(query, entity, filters, fields)
  } catch {
    return null
  }
}

const readVariantProductId = (
  row: Record<string, unknown> | null
) =>
  readNestedString(row, ["product", "id"]) ??
  readNestedString(row, ["product_id"])

const readVariantGraphProfileResolution = (
  variantId: string,
  row: Record<string, unknown> | null
): SmokeShippingProfileResolution | null => {
  const productId = readVariantProductId(row)
  const shippingProfileId = readNestedString(row, [
    "product",
    "shipping_profile",
    "id",
  ])

  if (productId && shippingProfileId) {
    return {
      smoke_variant_id: variantId,
      product_id: productId,
      resolved_shipping_profile_id: shippingProfileId,
      shipping_profile_resolution_source: "query_graph",
      product_profile_link_status: "existing",
      verified_product_shipping_profile_id: shippingProfileId,
    }
  }

  return null
}

const resolveSmokeVariantProductId = async (
  query: QueryGraph,
  variantId: string
): Promise<string> => {
  for (const entity of ["product_variant", "variant"]) {
    const row = await queryFirstSafe(query, entity, { id: variantId }, [
      "id",
      "product_id",
      "product.id",
    ])
    const productId = readVariantProductId(row)
    if (productId) return productId
  }

  throw new Error(`Unable to resolve product for smoke variant ${variantId}`)
}

const readProductShippingProfileLink = async (
  query: QueryGraph,
  productId: string,
  shippingProfileId?: string
) => {
  const filters: Record<string, unknown> = { product_id: productId }
  if (shippingProfileId) {
    filters.shipping_profile_id = shippingProfileId
  }
  const row = await queryFirstSafe(
    query,
    "product_shipping_profile",
    filters,
    ["id", "product_id", "shipping_profile_id", "shipping_profile.id"]
  )
  const linkedProductId = readNestedString(row, ["product_id"])
  const linkedProfileId =
    readNestedString(row, ["shipping_profile_id"]) ??
    readNestedString(row, ["shipping_profile", "id"])

  if (linkedProductId === productId && linkedProfileId) {
    return {
      link_id: readNestedString(row, ["id"]),
      product_id: linkedProductId,
      shipping_profile_id: linkedProfileId,
    }
  }

  return null
}

const resolveDefaultShippingProfile = async (
  container: ExecArgs["container"],
  query: QueryGraph,
  fulfillmentModule: any
) => {
  const graphProfile = await queryFirstSafe(
    query,
    "shipping_profile",
    { type: "default" },
    ["id", "name", "type"]
  )
  const graphProfileId = readNestedString(graphProfile, ["id"])
  if (graphProfileId) {
    return {
      id: graphProfileId,
      resolution_source: "existing_default_profile" as const,
    }
  }

  const moduleProfiles = await fulfillmentModule.listShippingProfiles?.(
    { type: "default" },
    { select: ["id", "name", "type"] }
  )
  const moduleProfile = Array.isArray(moduleProfiles)
    ? moduleProfiles.find((profile) => profile?.id)
    : null
  if (moduleProfile?.id) {
    return {
      id: String(moduleProfile.id),
      resolution_source: "existing_default_profile" as const,
    }
  }

  const { result } = await createShippingProfilesWorkflow(container).run({
    input: {
      data: [
        {
          name: SMOKE_SHIPPING_PROFILE_NAME,
          type: "default",
        },
      ],
    },
  })
  const createdProfileId = result?.[0]?.id
  if (!createdProfileId) {
    throw new Error("Unable to create Batch 11 smoke shipping profile")
  }

  return {
    id: String(createdProfileId),
    resolution_source: "created_smoke_profile" as const,
  }
}

export async function resolveSmokeVariantShippingProfile(
  query: QueryGraph,
  variantId: string
): Promise<SmokeShippingProfileResolution> {
  const variantGraphFields = [
    "id",
    "product_id",
    "product.id",
    "product.shipping_profile.id",
  ]

  for (const entity of ["product_variant", "variant"]) {
    const row = await queryFirstSafe(query, entity, { id: variantId }, variantGraphFields)
    const graphResolution = readVariantGraphProfileResolution(variantId, row)
    if (graphResolution) {
      return graphResolution
    }
  }

  const productId = await resolveSmokeVariantProductId(query, variantId)

  const productRow = await queryFirstSafe(
    query,
    "product",
    { id: productId },
    ["id", "shipping_profile.id"]
  )
  const productGraphProfileId = readNestedString(productRow, [
    "shipping_profile",
    "id",
  ])
  if (productGraphProfileId) {
    return {
      smoke_variant_id: variantId,
      product_id: productId,
      resolved_shipping_profile_id: productGraphProfileId,
      shipping_profile_resolution_source: "query_graph",
      product_profile_link_status: "existing",
      verified_product_shipping_profile_id: productGraphProfileId,
    }
  }

  const link = await readProductShippingProfileLink(query, productId)
  if (link) {
    return {
      smoke_variant_id: variantId,
      product_id: productId,
      resolved_shipping_profile_id: link.shipping_profile_id,
      shipping_profile_resolution_source: "remote_link",
      product_profile_link_status: "existing",
      verified_product_shipping_profile_id: link.shipping_profile_id,
    }
  }

  throw new Error(
    `Unable to resolve shipping profile for smoke variant ${variantId}`
  )
}

export async function ensureSmokeVariantShippingProfile({
  container,
  query,
  remoteLink,
  fulfillmentModule,
  variantId,
}: {
  container: ExecArgs["container"]
  query: QueryGraph
  remoteLink: { create: (links: Array<Record<string, Record<string, string>>>) => Promise<unknown> }
  fulfillmentModule: any
  variantId: string
}): Promise<SmokeShippingProfileResolution> {
  try {
    return await resolveSmokeVariantShippingProfile(query, variantId)
  } catch (error) {
    if (!readWorkflowErrorMessage(error).includes("Unable to resolve shipping profile")) {
      throw error
    }
  }

  const productId = await resolveSmokeVariantProductId(query, variantId)
  const defaultProfile = await resolveDefaultShippingProfile(
    container,
    query,
    fulfillmentModule
  )
  const existingLink = await readProductShippingProfileLink(
    query,
    productId,
    defaultProfile.id
  )
  if (existingLink) {
    return {
      smoke_variant_id: variantId,
      product_id: productId,
      resolved_shipping_profile_id: defaultProfile.id,
      shipping_profile_resolution_source: defaultProfile.resolution_source,
      product_profile_link_status: "reused",
      verified_product_shipping_profile_id: existingLink.shipping_profile_id,
    }
  }

  await remoteLink.create([
    {
      [Modules.PRODUCT]: {
        product_id: productId,
      },
      [Modules.FULFILLMENT]: {
        shipping_profile_id: defaultProfile.id,
      },
    },
  ])

  const verifiedLink = await readProductShippingProfileLink(
    query,
    productId,
    defaultProfile.id
  )
  if (verifiedLink?.shipping_profile_id !== defaultProfile.id) {
    throw new Error(
      `Unable to verify product shipping profile link for smoke product ${productId}`
    )
  }

  return {
    smoke_variant_id: variantId,
    product_id: productId,
    resolved_shipping_profile_id: defaultProfile.id,
    shipping_profile_resolution_source: defaultProfile.resolution_source,
    product_profile_link_status: "created",
    verified_product_shipping_profile_id: verifiedLink.shipping_profile_id,
  }
}

const readWorkflowErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export default async function batch11ShippingSmokeSetup({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK) as {
    create: (links: Array<Record<string, Record<string, string>>>) => Promise<unknown>
  }
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any
  const salesChannelId = await resolveDefaultSalesChannelId(container)
  if (!salesChannelId) {
    throw new Error("Default sales channel is required for Batch 11 shipping smoke setup")
  }
  const profileResolution = await ensureSmokeVariantShippingProfile({
    container,
    query,
    remoteLink,
    fulfillmentModule,
    variantId: SMOKE_VARIANT_ID,
  })
  const shippingProfileId = profileResolution.resolved_shipping_profile_id

  let location = await queryFirst(query, "stock_location", { name: LOCATION_NAME }, ["id", "name"])
  if (!location?.id) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{ name: LOCATION_NAME }],
      },
    })
    location = result[0] as Record<string, unknown>
  }

  const salesChannelLocationLink = await queryFirst(
    query,
    "sales_channel_location",
    {
      stock_location_id: String(location.id),
      sales_channel_id: salesChannelId,
    },
    ["id", "stock_location_id", "sales_channel_id"]
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
    ["id", "stock_location_id", "fulfillment_provider_id"]
  )
  if (!providerLink?.id) {
    await remoteLink.create([
      {
        [Modules.STOCK_LOCATION]: {
          stock_location_id: String(location.id),
        },
        [Modules.FULFILLMENT]: {
          fulfillment_provider_id: SHIPPING_PROVIDER_ID,
        },
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
    throw new Error("Unable to create Batch 11 smoke fulfillment set")
  }

  let serviceZone = await queryFirst(
    query,
    "service_zone",
    { name: SERVICE_ZONE_NAME },
    ["id", "name", "fulfillment_set_id"]
  )
  if (!serviceZone?.id) {
    const { result } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            name: SERVICE_ZONE_NAME,
            fulfillment_set_id: String(fulfillmentSet.id),
            geo_zones: [
              {
                type: "country",
                country_code: "cn",
              },
            ],
          },
        ],
      },
    })
    serviceZone = result[0] as unknown as Record<string, unknown>
  }

  const existingOptions = await fulfillmentModule.listShippingOptions({
    service_zone_id: String(serviceZone.id),
    shipping_profile_id: shippingProfileId,
  })
  let shippingOption = existingOptions[0] as Record<string, unknown> | undefined
  if (!shippingOption?.id) {
    const { result } = await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: `${SHIPPING_OPTION_NAME} (${shippingProfileId})`,
          service_zone_id: String(serviceZone.id),
          shipping_profile_id: shippingProfileId,
          provider_id: SHIPPING_PROVIDER_ID,
          type: {
            label: "Standard",
            description: "Batch 11 local smoke standard shipping",
            code: SHIPPING_OPTION_CODE,
          },
          price_type: "flat",
          prices: [
            {
              amount: 500,
              currency_code: "usd",
            },
          ],
        },
      ],
    })
    shippingOption = result[0] as unknown as Record<string, unknown>
  }

  console.log(
    JSON.stringify(
      {
        location_id: location.id,
        sales_channel_id: salesChannelId,
        smoke_variant_id: SMOKE_VARIANT_ID,
        product_id: profileResolution.product_id,
        resolved_shipping_profile_id: shippingProfileId,
        shipping_profile_resolution_source:
          profileResolution.shipping_profile_resolution_source,
        product_profile_link_status:
          profileResolution.product_profile_link_status,
        verified_product_shipping_profile_id:
          profileResolution.verified_product_shipping_profile_id,
        fulfillment_set_id: fulfillmentSet.id,
        service_zone_id: serviceZone.id,
        shipping_option_id: shippingOption?.id,
        shipping_option_name: shippingOption?.name ?? SHIPPING_OPTION_NAME,
      },
      null,
      2
    )
  )
}
