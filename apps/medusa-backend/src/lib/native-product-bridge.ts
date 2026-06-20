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

const BRIDGE_PRICE_CURRENCY = "usd"
const FALLBACK_PRICE = 19.99

export type NativeProductBridge = {
  medusaProductId: string
  medusaVariantId: string
}

const bridgeHandle = (productId: string) =>
  `store-core-${productId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")

async function findNativeProductAndVariantByHandle(
  container: MedusaContainer,
  handle: string
): Promise<{ productId: string; variantId: string } | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "product",
    fields: ["id", "variants.id"],
    filters: { handle },
  })) as { data: Array<{ id: string; variants?: Array<{ id?: string }> }> }

  const row = data[0]
  const variantId = row?.variants?.[0]?.id
  if (row?.id && variantId) {
    return { productId: row.id, variantId }
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
  const amount = Math.max(1, Math.round(price * 100))
  const handle = bridgeHandle(productId)

  const existing = await findNativeProductAndVariantByHandle(container, handle)
  if (existing) {
    await syncBridgeVariant(container, existing.variantId, product, existing.productId)
    await ensureVariantHasPriceSet(container, {
      variantId: existing.variantId,
      amount,
      currencyCode: BRIDGE_PRICE_CURRENCY,
    })
    return {
      medusaProductId: existing.productId,
      medusaVariantId: existing.variantId,
    }
  }

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: readString(product.title) ?? "Untitled product",
          handle,
          status: "published",
          metadata,
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              manage_inventory: false,
              allow_backorder: true,
              metadata,
              options: { Default: "Default" },
              prices: [
                {
                  amount,
                  currency_code: BRIDGE_PRICE_CURRENCY,
                },
              ],
            },
          ],
        },
      ],
    },
  })

  const nativeProduct = result[0]
  const nativeVariantId = nativeProduct?.variants?.[0]?.id
  if (!nativeProduct?.id || !nativeVariantId) {
    throw new Error(`Failed to create native bridge for ${productId}`)
  }

  await syncBridgeVariant(container, nativeVariantId, product, nativeProduct.id)
  await ensureVariantHasPriceSet(container, {
    variantId: nativeVariantId,
    amount,
    currencyCode: BRIDGE_PRICE_CURRENCY,
  })

  return {
    medusaProductId: nativeProduct.id,
    medusaVariantId: nativeVariantId,
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
