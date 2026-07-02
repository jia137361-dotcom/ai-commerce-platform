import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export type ProductShippingInput = {
  requires_shipping?: unknown
  metadata?: Record<string, unknown> | null
  platform_product_id?: string | null
  supplier_product_id?: string | null
}

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

export const resolveProductRequiresShipping = (product: ProductShippingInput): boolean => {
  if (typeof product.requires_shipping === "boolean") {
    return product.requires_shipping
  }

  const metadata = product.metadata ?? {}
  if (typeof metadata.requires_shipping === "boolean") {
    return metadata.requires_shipping
  }

  if (product.supplier_product_id || product.platform_product_id) {
    return true
  }

  return false
}

export const mergeRequiresShippingIntoMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  requiresShipping: boolean
) => ({
  ...(metadata ?? {}),
  requires_shipping: requiresShipping,
})

export async function ensureNativeProductShippingProfile(
  container: MedusaContainer,
  medusaProductId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK) as {
    create: (links: Array<Record<string, Record<string, string>>>) => Promise<unknown>
  }

  const defaultProfile = await queryFirst(
    query,
    "shipping_profile",
    { type: "default" },
    ["id", "name", "type"]
  )
  const shippingProfileId = typeof defaultProfile?.id === "string" ? defaultProfile.id : null
  if (!shippingProfileId) {
    return null
  }

  const existing = await queryFirst(
    query,
    "product_shipping_profile",
    { product_id: medusaProductId, shipping_profile_id: shippingProfileId },
    ["id", "product_id", "shipping_profile_id"]
  )
  if (existing?.id) {
    return shippingProfileId
  }

  await remoteLink.create([
    {
      [Modules.PRODUCT]: { product_id: medusaProductId },
      [Modules.FULFILLMENT]: { shipping_profile_id: shippingProfileId },
    },
  ])

  return shippingProfileId
}
