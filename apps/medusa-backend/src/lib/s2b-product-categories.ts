import type StoreCoreModuleService from "../modules/store-core/service"
import { ensureS2bProductCategories, syncBasicProduct } from "../modules/suppliers/services/supplier-sync-service"

const S2B_SUPPLIER_ID = "sup_s2bdiy"

const readRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const readString = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null

const readSupplierCategories = (value: unknown) => {
  const raw = readRecord(value)
  return (Array.isArray(raw.categorys) ? raw.categorys : []).flatMap((value) => {
    const row = readRecord(value)
    const id = Number(row.id)
    const name = readString(row.name)
    if (!Number.isFinite(id) || !name) return []
    return [{ id, name, en_name: readString(row.en_name) ?? undefined }]
  })
}

export const isS2bStoreProduct = (product: Record<string, unknown>) => {
  const metadata = readRecord(product.metadata)
  return product.supplier_id === S2B_SUPPLIER_ID ||
    metadata.import_source === "s2bdiy_supplier" ||
    metadata.import_source === "s2bdiy_csv"
}

export async function ensureCurrentStoreS2bCategoryIds(
  storeCore: StoreCoreModuleService,
  storeId: string,
  product: Record<string, unknown>
) {
  if (!isS2bStoreProduct(product)) return null

  const supplierProductId = readString(product.supplier_product_id)
  const basicProductId = readString(product.basic_product_id) ?? readString(readRecord(product.metadata).source_product_id)
  const supplierProducts = supplierProductId
    ? await storeCore.listSupplierProducts({ id: supplierProductId } as never)
    : basicProductId
      ? await storeCore.listSupplierProducts({ supplier_id: S2B_SUPPLIER_ID, basic_product_id: basicProductId } as never)
      : []
  const supplierProduct = supplierProducts[0] as Record<string, unknown> | undefined
  const categories = readSupplierCategories(supplierProduct?.raw_json)

  if (categories.length) {
    const ids = await ensureS2bProductCategories(storeCore, storeId, categories)
    return [...ids].reverse()
  }

  if (basicProductId && Number.isFinite(Number(basicProductId))) {
    try {
      const synced = await syncBasicProduct(Number(basicProductId), S2B_SUPPLIER_ID, {
        storeCoreService: storeCore,
        storeId,
      })
      return [...synced.category_ids].reverse()
    } catch {
      return []
    }
  }

  return []
}
