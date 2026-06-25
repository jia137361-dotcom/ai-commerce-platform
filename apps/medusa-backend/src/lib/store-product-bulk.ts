import type StoreCoreModuleService from "../modules/store-core/service"

export type BulkStoreProductAction = "archive" | "delete"

export type BulkStoreProductItemResult = {
  product_id: string
  status: "succeeded" | "failed" | "skipped"
  message?: string
  product_status?: string
}

export type BulkStoreProductResult = {
  action: BulkStoreProductAction
  succeeded: number
  failed: number
  skipped: number
  results: BulkStoreProductItemResult[]
}

type StoreCoreService = Pick<StoreCoreModuleService, "listProducts" | "updateProducts" | "deleteProducts">

const MAX_BULK_PRODUCT_IDS = 50
const PERMANENTLY_DELETABLE_STATUSES = new Set(["draft", "archived"])

export const canPermanentlyDeleteProduct = (status?: string | null) =>
  PERMANENTLY_DELETABLE_STATUSES.has(String(status ?? "").toLowerCase())

export const parseBulkStoreProductIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new Error("product_ids must be an array")
  }
  const ids = value
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter(Boolean)
  if (!ids.length) {
    throw new Error("product_ids must contain at least one id")
  }
  if (ids.length > MAX_BULK_PRODUCT_IDS) {
    throw new Error(`product_ids cannot exceed ${MAX_BULK_PRODUCT_IDS} items`)
  }
  return Array.from(new Set(ids))
}

export const parseBulkStoreProductAction = (value: unknown): BulkStoreProductAction => {
  if (value === "archive" || value === "delete") return value
  throw new Error('action must be "archive" or "delete"')
}

export async function bulkStoreProductAction(
  storeCoreService: StoreCoreService,
  storeId: string,
  productIds: string[],
  action: BulkStoreProductAction
): Promise<BulkStoreProductResult> {
  const products = await storeCoreService.listProducts({
    id: productIds,
    store_id: storeId,
  })
  const byId = new Map(products.map((product) => [product.id, product]))
  const results: BulkStoreProductItemResult[] = []

  for (const productId of productIds) {
    const product = byId.get(productId)
    if (!product) {
      results.push({
        product_id: productId,
        status: "failed",
        message: "Product not found",
      })
      continue
    }

    if (action === "archive") {
      if (product.status === "archived") {
        results.push({
          product_id: productId,
          status: "skipped",
          product_status: product.status,
          message: "Already archived",
        })
        continue
      }

      const updated = await storeCoreService.updateProducts({
        selector: { id: productId, store_id: storeId },
        data: { status: "archived" },
      })
      const updatedProduct = Array.isArray(updated) ? updated[0] : updated
      if (!updatedProduct?.id) {
        results.push({
          product_id: productId,
          status: "failed",
          message: "Failed to archive product",
        })
        continue
      }
      results.push({
        product_id: productId,
        status: "succeeded",
        product_status: updatedProduct.status,
      })
      continue
    }

    if (!canPermanentlyDeleteProduct(product.status)) {
      results.push({
        product_id: productId,
        status: "failed",
        product_status: product.status,
        message: "Only draft or archived products can be permanently deleted",
      })
      continue
    }

    await storeCoreService.deleteProducts(productId)
    results.push({
      product_id: productId,
      status: "succeeded",
      product_status: "deleted",
    })
  }

  return {
    action,
    succeeded: results.filter((row) => row.status === "succeeded").length,
    failed: results.filter((row) => row.status === "failed").length,
    skipped: results.filter((row) => row.status === "skipped").length,
    results,
  }
}

export async function permanentlyDeleteStoreProduct(
  storeCoreService: StoreCoreService,
  storeId: string,
  productId: string
) {
  const products = await storeCoreService.listProducts({
    id: productId,
    store_id: storeId,
  })
  const product = products[0]
  if (!product) return { ok: false as const, code: "PRODUCT_NOT_FOUND" as const }
  if (!canPermanentlyDeleteProduct(product.status)) {
    return { ok: false as const, code: "NOT_DELETABLE" as const, status: product.status }
  }
  await storeCoreService.deleteProducts(productId)
  return { ok: true as const, product_id: productId }
}

/** @deprecated Use permanentlyDeleteStoreProduct */
export const permanentlyDeleteArchivedStoreProduct = permanentlyDeleteStoreProduct
