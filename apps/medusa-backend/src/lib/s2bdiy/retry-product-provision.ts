import type StoreCoreModuleService from "../../modules/store-core/service"
import { getMcProductById } from "../../api/_helpers/store-core"
import { isS2bdiyEnabled } from "../../modules/suppliers/s2bdiy/config"
import {
  provisionS2bProductForMcProduct,
  resolveS2bIdsFromEnvOrVariant,
} from "./provision-s2b-product"

const CATALOG_SUPPLIER_PRODUCT_PREFIX = /^sp_/

export function isCatalogSupplierProductId(id: string | null | undefined): boolean {
  if (!id) return false
  return CATALOG_SUPPLIER_PRODUCT_PREFIX.test(id)
}

export function isS2bProvisioned(product: Record<string, unknown>): boolean {
  const supplierProductId =
    typeof product.supplier_product_id === "string" ? product.supplier_product_id : null
  if (!supplierProductId || isCatalogSupplierProductId(supplierProductId)) {
    return false
  }
  return Boolean(product.supplier_material_id) || /^\d+$/.test(supplierProductId)
}

export type RetryS2bProvisionResult = {
  provisioned: boolean
  already_provisioned: boolean
  s2b_provision_error: string | null
  supplier_product_id: string | null
}

export async function retryS2bProvisionForMcProduct(
  storeCore: StoreCoreModuleService,
  productId: string,
  storeId: string
): Promise<RetryS2bProvisionResult> {
  const product = await getMcProductById(storeCore, productId, storeId)
  if (!product) {
    throw new Error("Product not found")
  }

  if (isS2bProvisioned(product as Record<string, unknown>)) {
    return {
      provisioned: true,
      already_provisioned: true,
      s2b_provision_error: null,
      supplier_product_id:
        typeof product.supplier_product_id === "string" ? product.supplier_product_id : null,
    }
  }

  if (!isS2bdiyEnabled()) {
    throw new Error("S2BDIY is not configured on this server")
  }

  const printFileUrl =
    (typeof product.print_file_url === "string" && product.print_file_url) ||
    (typeof (product.metadata as Record<string, unknown> | undefined)?.print_file_url === "string"
      ? ((product.metadata as Record<string, unknown>).print_file_url as string)
      : null)

  if (!printFileUrl) {
    throw new Error("Product has no print file — cannot provision S2BDIY fulfillment")
  }

  const catalogSupplierProductId =
    typeof product.supplier_product_id === "string" &&
    isCatalogSupplierProductId(product.supplier_product_id)
      ? product.supplier_product_id
      : null

  const spRows = catalogSupplierProductId
    ? await storeCore.listSupplierProducts({ id: catalogSupplierProductId })
    : []
  const sp = spRows[0] as Record<string, unknown> | undefined
  const basicFromCatalog =
    sp?.basic_product_id != null ? String(sp.basic_product_id) : null

  const variants = Array.isArray(product.variants) ? product.variants : []
  const supplierVariant = variants.find(
    (row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object" && typeof (row as Record<string, unknown>).supplier_variant_id === "string")
  )

  const productForS2b = {
    ...(product as Record<string, unknown>),
    ...(basicFromCatalog ? { basic_product_id: basicFromCatalog } : {}),
  }

  const s2bIds = resolveS2bIdsFromEnvOrVariant(supplierVariant, productForS2b)
  if (!s2bIds) {
    throw new Error("Missing S2BDIY blank product configuration (basic_product_id, size, color)")
  }

  const persistFields = {
    basic_product_id: s2bIds.basicProductId,
    supplier_size_id: String(s2bIds.sizeId),
    supplier_color_id: String(s2bIds.colorId),
    view_id: String(s2bIds.viewId),
    design_type: 1,
  }
  await storeCore.updateProducts({
    selector: { id: productId, store_id: storeId },
    data: persistFields,
  })

  const title = typeof product.title === "string" && product.title.trim() ? product.title.trim() : "Untitled design"
  const metadata = (product.metadata ?? {}) as Record<string, unknown>

  try {
    await provisionS2bProductForMcProduct(storeCore, {
      productId,
      storeId,
      title,
      printFileUrl,
      basicProductId: s2bIds.basicProductId,
      sizeId: s2bIds.sizeId,
      colorId: s2bIds.colorId,
      viewId: s2bIds.viewId,
    })

    await storeCore.updateProducts({
      selector: { id: productId, store_id: storeId },
      data: {
        metadata: {
          ...metadata,
          s2b_provision_error: null,
        },
      },
    })

    const refreshed = await getMcProductById(storeCore, productId, storeId)
    return {
      provisioned: true,
      already_provisioned: false,
      s2b_provision_error: null,
      supplier_product_id:
        typeof refreshed?.supplier_product_id === "string" ? refreshed.supplier_product_id : null,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await storeCore.updateProducts({
      selector: { id: productId, store_id: storeId },
      data: {
        metadata: {
          ...metadata,
          s2b_provision_error: message,
        },
      },
    })
    return {
      provisioned: false,
      already_provisioned: false,
      s2b_provision_error: message,
      supplier_product_id:
        typeof product.supplier_product_id === "string" ? product.supplier_product_id : null,
    }
  }
}
