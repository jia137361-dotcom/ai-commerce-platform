import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ensureVariantHasPriceSet } from "./ensure-variant-price-set"
import { ensureNativeProductShippingProfile, resolveProductRequiresShipping } from "./product-shipping"
import {
  buildNativeBridgeMetadata,
  findMedusaVariantReuseConflict,
  hasDedicatedNativeBridge,
  isSharedSkuProduct,
  readRecord,
  readString,
} from "./product-cart-bridge"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { readStoreCoreVariantRows, type StoreCoreVariantRow } from "./native-product-variants"

const BRIDGE_PRICE_CURRENCY = "usd"
const FALLBACK_PRICE = 19.99

export type NativeProductBridge = {
  medusaProductId: string
  medusaVariantId: string
  variantMappings?: Array<{
    supplier_variant_id: string
    medusa_variant_id: string
  }>
}

const bridgeHandle = (productId: string, multiVariant = false) =>
  `store-core-${productId}${multiVariant ? "-multi" : ""}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")

async function findNativeProductAndVariantByHandle(
  container: MedusaContainer,
  handle: string
): Promise<{ productId: string; variantId: string; variants: Array<{ id?: string; metadata?: Record<string, unknown> | null }> } | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "product",
    fields: ["id", "variants.id", "variants.metadata"],
    filters: { handle },
  })) as { data: Array<{ id: string; variants?: Array<{ id?: string; metadata?: Record<string, unknown> | null }> }> }

  const row = data[0]
  const variantId = row?.variants?.[0]?.id
  if (row?.id && variantId) {
    return { productId: row.id, variantId, variants: row.variants ?? [] }
  }
  return null
}

async function syncBridgeVariant(
  container: MedusaContainer,
  variantId: string,
  product: Record<string, unknown>,
  medusaProductId?: string
) {
  const productModule = container.resolve(Modules.PRODUCT) as {
    updateProductVariants: (
      id: string,
      data: { manage_inventory: boolean; allow_backorder: boolean }
    ) => Promise<unknown>
  }

  await productModule.updateProductVariants(variantId, {
    manage_inventory: false,
    allow_backorder: true,
  })

  if (medusaProductId && resolveProductRequiresShipping(product)) {
    await ensureNativeProductShippingProfile(container, medusaProductId)
  }
}

async function createNativeBridgeProduct(
  container: MedusaContainer,
  product: Record<string, unknown>,
  storeId: string
): Promise<NativeProductBridge> {
  const productId = readString(product.id)
  if (!productId) {
    throw new Error("Cannot create native bridge without product id")
  }

  const metadata = buildNativeBridgeMetadata(productId, storeId)
  const price =
    typeof product.price === "number" && product.price > 0 ? product.price : FALLBACK_PRICE
  const variantRows = readStoreCoreVariantRows(product, price)
  const hasMultipleVariants = variantRows.length > 1
  const handle = bridgeHandle(productId, hasMultipleVariants)

  const existing = await findNativeProductAndVariantByHandle(container, handle)
  if (existing) {
    const existingVariants = existing.variants
    const rowsBySupplierId = new Map(variantRows.map((row) => [row.supplier_variant_id, row]))
    for (const nativeVariant of existingVariants) {
      if (!nativeVariant.id) continue
      const supplierVariantId = readString(nativeVariant.metadata?.supplier_variant_id)
      const row = supplierVariantId ? rowsBySupplierId.get(supplierVariantId) : undefined
      await syncBridgeVariant(container, nativeVariant.id, product, existing.productId)
      await ensureVariantHasPriceSet(container, {
        variantId: nativeVariant.id,
        amount: Math.max(1, Math.round((row?.price ?? price) * 100)),
        currencyCode: BRIDGE_PRICE_CURRENCY,
      })
    }
    return {
      medusaProductId: existing.productId,
      medusaVariantId: existing.variantId,
      variantMappings: existingVariants.flatMap((nativeVariant) => {
        const supplierVariantId = readString(nativeVariant.metadata?.supplier_variant_id)
        return nativeVariant.id && supplierVariantId
          ? [{ supplier_variant_id: supplierVariantId, medusa_variant_id: nativeVariant.id }]
          : []
      }),
    }
  }

  const rows: StoreCoreVariantRow[] = variantRows.length
    ? variantRows
    : [{
        supplier_variant_id: readString(product.supplier_variant_id) ?? `default-${productId}`,
        color: "Default",
        size: "Default",
        price,
        stock: 0,
      }]
  const optionPairs = new Set(rows.map((row) => `${row.color}\u0000${row.size}`))
  const needsSupplierOption = optionPairs.size !== rows.length
  const options = [
    { title: "Color", values: [...new Set(rows.map((row) => row.color))] },
    { title: "Size", values: [...new Set(rows.map((row) => row.size))] },
    ...(needsSupplierOption
      ? [{ title: "Supplier option", values: rows.map((row) => row.supplier_variant_id) }]
      : []),
  ]

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: readString(product.title) ?? "Untitled product",
          handle,
          status: "published",
          metadata,
          options,
          variants: rows.map((row) => {
            const variantMetadata = {
              ...metadata,
              supplier_variant_id: row.supplier_variant_id,
            }
            return {
              title: [row.color, row.size].filter((value) => value !== "Default").join(" / ") || "Default",
              manage_inventory: false,
              allow_backorder: true,
              metadata: variantMetadata,
              options: {
                Color: row.color,
                Size: row.size,
                ...(needsSupplierOption ? { "Supplier option": row.supplier_variant_id } : {}),
              },
              prices: [
                {
                  amount: Math.max(1, Math.round(row.price * 100)),
                  currency_code: BRIDGE_PRICE_CURRENCY,
                },
              ],
            }
          }),
        },
      ],
    },
  })

  const nativeProduct = result[0]
  const nativeVariantId = nativeProduct?.variants?.[0]?.id
  if (!nativeProduct?.id || !nativeVariantId) {
    throw new Error(`Failed to create native bridge for ${productId}`)
  }

  const createdVariants = nativeProduct.variants ?? []
  for (let index = 0; index < createdVariants.length; index += 1) {
    const createdVariantId = createdVariants[index]?.id
    if (!createdVariantId) continue
    await syncBridgeVariant(container, createdVariantId, product, nativeProduct.id)
    await ensureVariantHasPriceSet(container, {
      variantId: createdVariantId,
      amount: Math.max(1, Math.round((rows[index]?.price ?? price) * 100)),
      currencyCode: BRIDGE_PRICE_CURRENCY,
    })
  }

  return {
    medusaProductId: nativeProduct.id,
    medusaVariantId: nativeVariantId,
    variantMappings: rows.flatMap((row, index) => {
      const id = createdVariants[index]?.id
      return id ? [{ supplier_variant_id: row.supplier_variant_id, medusa_variant_id: id }] : []
    }),
  }
}

async function validateSharedNativeVariant(
  container: MedusaContainer,
  medusaVariantId: string,
  medusaProductId: string | null,
  currentStoreId: string
): Promise<NativeProductBridge> {
  const productModule = container.resolve(Modules.PRODUCT)
  const nativeVariant = await productModule.retrieveProductVariant(medusaVariantId, {
    relations: ["product"],
  })
  const nativeProduct = nativeVariant.product as Record<string, unknown> | undefined
  const nativeProductId = readString(nativeVariant.product_id) ?? readString(nativeProduct?.id)

  if (medusaProductId && nativeProductId && medusaProductId !== nativeProductId) {
    throw new Error("medusa_product_id must match the product for medusa_variant_id")
  }

  const variantStoreId = readString(readRecord(nativeVariant.metadata).store_id)
  const productStoreId = readString(readRecord(nativeProduct?.metadata).store_id)
  if (
    (variantStoreId && variantStoreId !== currentStoreId) ||
    (productStoreId && productStoreId !== currentStoreId)
  ) {
    throw new Error("medusa_variant_id metadata.store_id must match current store")
  }

  return {
    medusaProductId: medusaProductId ?? nativeProductId ?? "",
    medusaVariantId,
  }
}

export async function resolveNativeBridgeForPublish(
  container: MedusaContainer,
  product: Record<string, unknown>,
  currentStoreId: string
): Promise<NativeProductBridge> {
  const productId = readString(product.id)
  if (!productId) {
    throw new Error("Product id is required")
  }

  const medusaVariantId = readString(product.medusa_variant_id)
  const medusaProductId = readString(product.medusa_product_id)
  const sharedSku = isSharedSkuProduct(product)

  if (!medusaVariantId) {
    return createNativeBridgeProduct(container, product, currentStoreId)
  }

  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const linkedProducts = await storeCoreService.listProducts({
    medusa_variant_id: medusaVariantId,
  })
  const reuseConflict = findMedusaVariantReuseConflict(linkedProducts, productId)

  if (sharedSku) {
    return validateSharedNativeVariant(container, medusaVariantId, medusaProductId, currentStoreId)
  }

  const productModule = container.resolve(Modules.PRODUCT)
  let nativeVariant: Record<string, unknown> | null = null
  try {
    nativeVariant = (await productModule.retrieveProductVariant(medusaVariantId, {
      relations: ["product"],
    })) as unknown as Record<string, unknown>
  } catch {
    return createNativeBridgeProduct(container, product, currentStoreId)
  }

  const nativeProduct = nativeVariant.product as Record<string, unknown> | undefined
  const dedicated = hasDedicatedNativeBridge(
    nativeVariant,
    nativeProduct,
    productId,
    currentStoreId
  )

  if (reuseConflict || !dedicated) {
    return createNativeBridgeProduct(container, product, currentStoreId)
  }

  await syncBridgeVariant(
    container,
    medusaVariantId,
    product,
    readString(nativeVariant.product_id) ?? readString(nativeProduct?.id) ?? undefined
  )
  const nativeProductId = readString(nativeVariant.product_id) ?? readString(nativeProduct?.id)
  return {
    medusaProductId: medusaProductId ?? nativeProductId ?? "",
    medusaVariantId,
  }
}
