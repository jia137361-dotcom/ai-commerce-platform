import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { ensureNativeBridgeCartable } from "../../../../lib/ensure-native-bridge-cartable"
import { ensureNativeProductShippingProfile, resolveProductRequiresShipping } from "../../../../lib/product-shipping"
import { resolveNativeBridgeForPublish } from "../../../../lib/native-product-bridge"
import { productNeedsCartBridgeBackfill, readRecord, readString } from "../../../../lib/product-cart-bridge"
import { getMcProductById, getStoreCoreService, normalizeProduct } from "../../../_helpers/store-core"
import { listImportedDrafts } from "../../../../lib/s2b-product-import/service"
import { ensureCurrentStoreS2bCategoryIds } from "../../../../lib/s2b-product-categories"

async function publishOne(req: MedusaRequest, productId: string, storeId: string) {
  const storeCore = getStoreCoreService(req)
  const product = await getMcProductById(storeCore, productId, storeId)
  if (!product) throw new Error(`Product not found: ${productId}`)
  const metadata = readRecord(product.metadata)
  if (metadata.import_source !== "s2bdiy_csv") {
    throw new Error(`Product is not an imported S2B draft: ${productId}`)
  }
  if (product.store_id !== storeId) throw new Error(`Product store mismatch: ${productId}`)
  if (product.status === "archived") throw new Error(`Cannot publish archived product: ${productId}`)

  const sourceProductId = readString(metadata.source_product_id) ?? readString(product.basic_product_id)
  if (sourceProductId && product.status !== "published") {
    const matches = (await storeCore.listProducts({
      store_id: storeId,
      supplier_id: product.supplier_id,
      basic_product_id: sourceProductId,
      status: "published",
    } as never)) as Array<Record<string, unknown>>
    const duplicate = matches.find((row) => readString(row.id) !== productId)
    if (duplicate) {
      throw new Error(
        `Duplicate S2B product already published: source_product_id=${sourceProductId}, product_id=${duplicate.id}`
      )
    }
  }

  const bridge = await resolveNativeBridgeForPublish(req.scope, product as Record<string, unknown>, storeId)
  await ensureNativeBridgeCartable(req.scope, bridge)
  if (resolveProductRequiresShipping(product as Record<string, unknown>)) {
    await ensureNativeProductShippingProfile(req.scope, bridge.medusaProductId)
  }

  const updateData: Record<string, unknown> = {
    status: "published",
    medusa_product_id: bridge.medusaProductId,
    medusa_variant_id: bridge.medusaVariantId,
    metadata: {
      ...metadata,
      import_status: "published",
      published_from_import_at: new Date().toISOString(),
    },
  }
  const categoryIds = await ensureCurrentStoreS2bCategoryIds(storeCore, storeId, product as Record<string, unknown>)
  if (categoryIds?.length) updateData.category_ids = categoryIds

  if (bridge.variantMappings?.length && Array.isArray(product.variants)) {
    const mappings = new Map(
      bridge.variantMappings.map((entry) => [entry.supplier_variant_id, entry.medusa_variant_id])
    )
    updateData.variants = product.variants.map((value: unknown) => {
      if (!value || typeof value !== "object") return value
      const row = value as Record<string, unknown>
      const supplierVariantId = readString(row.supplier_variant_id)
      return supplierVariantId && mappings.has(supplierVariantId)
        ? { ...row, medusa_variant_id: mappings.get(supplierVariantId) }
        : row
    })
  }

  if (productNeedsCartBridgeBackfill(product)) updateData.status = "published"

  const updated = await storeCore.updateProducts({
    selector: { id: productId, store_id: storeId },
    data: updateData,
  })
  return Array.isArray(updated) ? updated[0] : updated
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const body = (req.body ?? {}) as {
    product_ids?: string[]
    filters?: Record<string, unknown>
  }

  let productIds = (body.product_ids ?? []).map((id) => id.trim()).filter(Boolean)
  if (!productIds.length && body.filters) {
    const result = await listImportedDrafts({ container: req.scope, storeId, filters: body.filters })
    productIds = result.products.map((product: { product_id: string }) => product.product_id)
  }
  productIds = [...new Set(productIds)]

  if (!productIds.length) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Select products before publishing" },
    })
  }

  const published = []
  const failed = []
  for (const productId of productIds) {
    try {
      const product = await publishOne(req, productId, storeId)
      published.push(normalizeProduct(product))
    } catch (error) {
      failed.push({
        product_id: productId,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return res.status(200).json({
    published_count: published.length,
    failed_count: failed.length,
    products: published,
    failed,
  })
}
