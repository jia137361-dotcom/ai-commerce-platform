import type StoreCoreModuleService from "../../modules/store-core/service"
import { getMcProductById } from "../../api/_helpers/store-core"
import { getS2bdiyConfig, isS2bdiyMockMode } from "../../modules/suppliers/s2bdiy/config"
import {
  provisionS2bProductForMcProduct,
  resolveS2bIdsFromEnvOrVariant,
} from "./provision-s2b-product"
import { isCatalogSupplierProductId } from "./retry-product-provision"

function isStaleMockProvision(product: Record<string, unknown>): boolean {
  if (isS2bdiyMockMode()) return true
  const materialId = product.supplier_material_id
  return typeof materialId === "string" && materialId.startsWith("mock_")
}

export type EnsureRealS2bDesignAssetsResult = {
  product: Record<string, unknown>
  refreshed: boolean
}

function readPrintFileUrl(product: Record<string, unknown>): string | null {
  if (typeof product.print_file_url === "string" && product.print_file_url.trim()) {
    return product.print_file_url.trim()
  }
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  if (typeof metadata.print_file_url === "string" && metadata.print_file_url.trim()) {
    return metadata.print_file_url.trim()
  }
  const gallery = metadata.gallery
  if (Array.isArray(gallery)) {
    const printItem = gallery.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as Record<string, unknown>).kind === "print_file" &&
        typeof (item as Record<string, unknown>).url === "string"
    ) as Record<string, unknown> | undefined
    if (printItem?.url) return String(printItem.url)
  }
  return null
}

function pickSupplierVariant(product: Record<string, unknown>): Record<string, unknown> | undefined {
  const variants = Array.isArray(product.variants) ? product.variants : []
  return variants.find(
    (row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object" && typeof (row as Record<string, unknown>).supplier_variant_id === "string")
  )
}

async function resolveBasicProductIdFromCatalog(
  storeCore: StoreCoreModuleService,
  product: Record<string, unknown>
): Promise<string | null> {
  if (typeof product.basic_product_id === "string" && product.basic_product_id.trim()) {
    return product.basic_product_id.trim()
  }
  const supplierProductId =
    typeof product.supplier_product_id === "string" ? product.supplier_product_id : null
  if (!supplierProductId || !isCatalogSupplierProductId(supplierProductId)) {
    return process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ?? null
  }
  const spRows = await storeCore.listSupplierProducts({ id: supplierProductId })
  const sp = spRows[0] as Record<string, unknown> | undefined
  if (sp?.basic_product_id != null) return String(sp.basic_product_id)
  return process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ?? null
}

export async function ensureRealS2bDesignAssets(
  storeCore: StoreCoreModuleService,
  productId: string,
  storeId: string,
  product: Record<string, unknown>
): Promise<EnsureRealS2bDesignAssetsResult> {
  if (isS2bdiyMockMode() || !getS2bdiyConfig() || !isStaleMockProvision(product)) {
    return { product, refreshed: false }
  }

  const printFileUrl = readPrintFileUrl(product)
  if (!printFileUrl) {
    throw new Error("S2B_PRINT_FILE_REQUIRED")
  }

  const supplierVariant = pickSupplierVariant(product)
  const productForS2b = { ...product }
  const basicFromCatalog = await resolveBasicProductIdFromCatalog(storeCore, product)
  if (basicFromCatalog) {
    productForS2b.basic_product_id = basicFromCatalog
  }

  const s2bIds = resolveS2bIdsFromEnvOrVariant(supplierVariant, productForS2b)
  if (!s2bIds) {
    throw new Error("S2B_BLANK_PRODUCT_CONFIG_REQUIRED")
  }

  const title =
    typeof product.title === "string" && product.title.trim() ? product.title.trim() : "Untitled design"

  await provisionS2bProductForMcProduct(storeCore, {
    productId,
    storeId,
    title,
    printFileUrl,
    basicProductId: s2bIds.basicProductId,
    sizeId: s2bIds.sizeId,
    colorId: s2bIds.colorId,
    viewId: s2bIds.viewId,
    designType: Number(product.design_type ?? 1) || 1,
  })

  const refreshedProduct = await getMcProductById(storeCore, productId, storeId)
  if (!refreshedProduct) {
    throw new Error("PRODUCT_NOT_FOUND")
  }

  return {
    product: refreshedProduct as Record<string, unknown>,
    refreshed: true,
  }
}
