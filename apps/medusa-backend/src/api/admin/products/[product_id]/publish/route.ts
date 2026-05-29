import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { inspect } from "node:util"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  getStoreCoreService,
  normalizeProduct,
  sendError
} from "../../../../_helpers/store-core"
import { ensureVariantHasPriceSet } from "../../../../../lib/ensure-variant-price-set"
import {
  buildNativeBridgeMetadata,
  findMedusaVariantReuseConflict,
  hasDedicatedNativeBridge,
  isSharedSkuProduct,
  readRecord,
  readString,
} from "../../../../../lib/product-cart-bridge"

const BRIDGE_PRICE_CURRENCY = "usd"
const FALLBACK_PRICE = 19.99

const bridgeHandle = (productId: string) =>
  `store-core-${productId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")

function bridgeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "string") {
    return error
  }
  const message = readString(readRecord(error).message)
  if (message) {
    return message
  }
  return inspect(error, { depth: 8, breakLength: 160 })
}

function bridgeErrorStack(error: unknown) {
  return error instanceof Error ? error.stack : undefined
}

async function findNativeProductAndVariantByHandle(
  req: MedusaRequest,
  handle: string
): Promise<{ productId: string; variantId: string } | null> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
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

async function ensureNativeBridgeVariantCartable(req: MedusaRequest, variantId: string) {
  const productModule = req.scope.resolve(Modules.PRODUCT) as {
    updateProductVariants: (
      id: string,
      data: { manage_inventory: boolean; allow_backorder: boolean }
    ) => Promise<unknown>
  }

  await productModule.updateProductVariants(variantId, {
    manage_inventory: false,
    allow_backorder: true,
  })
}

async function createNativeBridgeProduct(req: MedusaRequest, product: any, storeId: string) {
  const productId = readString(product.id)
  if (!productId) {
    throw new Error("Cannot create native bridge without product id")
  }

  const metadata = buildNativeBridgeMetadata(productId, storeId)
  const price =
    typeof product.price === "number" && product.price > 0 ? product.price : FALLBACK_PRICE
  const amount = Math.max(1, Math.round(price * 100))
  const handle = bridgeHandle(productId)

  const existing = await findNativeProductAndVariantByHandle(req, handle)
  if (existing) {
    await ensureNativeBridgeVariantCartable(req, existing.variantId)
    await ensureVariantHasPriceSet(req.scope, {
      variantId: existing.variantId,
      amount,
      currencyCode: BRIDGE_PRICE_CURRENCY,
    })
    return {
      medusaProductId: existing.productId,
      medusaVariantId: existing.variantId,
    }
  }

  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [
        {
          title: product.title,
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

  await ensureNativeBridgeVariantCartable(req, nativeVariantId)
  await ensureVariantHasPriceSet(req.scope, {
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
  req: MedusaRequest,
  medusaVariantId: string,
  medusaProductId: string | null,
  currentStoreId: string
) {
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const nativeVariant = await productModule.retrieveProductVariant(medusaVariantId, {
    relations: ["product"]
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
    medusaProductId: medusaProductId ?? nativeProductId,
    medusaVariantId,
  }
}

async function resolveNativeBridgeForPublish(
  req: MedusaRequest,
  product: any,
  currentStoreId: string
) {
  const productId = readString(product.id)
  if (!productId) {
    throw new Error("Product id is required")
  }

  const medusaVariantId = readString(product.medusa_variant_id)
  const medusaProductId = readString(product.medusa_product_id)
  const sharedSku = isSharedSkuProduct(product)

  if (!medusaVariantId) {
    return createNativeBridgeProduct(req, product, currentStoreId)
  }

  const storeCoreService = getStoreCoreService(req)
  const linkedProducts = await storeCoreService.listProducts({
    medusa_variant_id: medusaVariantId,
  })
  const reuseConflict = findMedusaVariantReuseConflict(linkedProducts, productId)

  if (sharedSku) {
    return validateSharedNativeVariant(req, medusaVariantId, medusaProductId, currentStoreId)
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)
  let nativeVariant: any = null
  try {
    nativeVariant = await productModule.retrieveProductVariant(medusaVariantId, {
      relations: ["product"]
    })
  } catch {
    return createNativeBridgeProduct(req, product, currentStoreId)
  }

  const nativeProduct = nativeVariant.product as Record<string, unknown> | undefined
  const dedicated = hasDedicatedNativeBridge(
    nativeVariant as Record<string, unknown>,
    nativeProduct,
    productId,
    currentStoreId
  )

  if (reuseConflict || !dedicated) {
    return createNativeBridgeProduct(req, product, currentStoreId)
  }

  await ensureNativeBridgeVariantCartable(req, medusaVariantId)
  const nativeProductId = readString(nativeVariant.product_id) ?? readString(nativeProduct?.id)
  return {
    medusaProductId: medusaProductId ?? nativeProductId,
    medusaVariantId,
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { product_id: productId } = req.params
  const { store_id: currentStoreId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const products = await storeCoreService.listProducts({ id: productId })
  const product = products[0]

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  if (product.store_id !== currentStoreId) {
    return sendError(
      res,
      403,
      "PRODUCT_STORE_MISMATCH",
      "Product does not belong to current store"
    )
  }

  let bridge
  try {
    bridge = await resolveNativeBridgeForPublish(req, product, currentStoreId)
  } catch (error: unknown) {
    console.error("product cart bridge publish failed:", {
      product_id: productId,
      store_id: currentStoreId,
      message: bridgeErrorMessage(error),
      stack: bridgeErrorStack(error),
    })
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      bridgeErrorMessage(error)
    )
  }

  const [updatedProduct] = await storeCoreService.updateProducts({
    selector: {
      id: productId,
      store_id: currentStoreId
    },
    data: {
      status: "published",
      medusa_product_id: bridge.medusaProductId,
      medusa_variant_id: bridge.medusaVariantId,
    }
  })

  return res.json({
    product_id: updatedProduct.id,
    store_id: updatedProduct.store_id,
    status: updatedProduct.status,
    product: normalizeProduct(updatedProduct)
  })
}
