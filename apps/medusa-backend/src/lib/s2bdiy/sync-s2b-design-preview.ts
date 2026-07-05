import type StoreCoreModuleService from "../../modules/store-core/service"
import { getS2bdiyConfig, isS2bdiyMockMode } from "../../modules/suppliers/s2bdiy/config"
import { S2bdiyClient } from "../../modules/suppliers/s2bdiy/s2bdiy-client"
import {
  extractProductMockupGalleryFromS2bDetail,
  getProductDetail,
  mergeProductGalleryWithS2bMockups,
  type S2bProductGalleryItem,
} from "../../modules/suppliers/s2bdiy/s2bdiy-product"
import { isCatalogSupplierProductId } from "./retry-product-provision"

export type SyncS2bDesignPreviewInput = {
  productId: string
  storeId: string
  s2bProductId?: string | number | null
  mockupUrls?: string[] | null
}

export type SyncS2bDesignPreviewResult = {
  supplier_product_id: string | null
  mockup_image_url: string | null
  gallery: S2bProductGalleryItem[]
}

function resolveS2bProductId(
  product: Record<string, unknown>,
  override?: string | number | null
): string | null {
  if (override != null && String(override).trim()) {
    return String(override).trim()
  }
  const supplierProductId =
    typeof product.supplier_product_id === "string" ? product.supplier_product_id : null
  if (!supplierProductId || isCatalogSupplierProductId(supplierProductId)) {
    return null
  }
  return /^\d+$/.test(supplierProductId) ? supplierProductId : null
}

function mockupsFromUrls(urls: string[]): S2bProductGalleryItem[] {
  const seen = new Set<string>()
  const items: S2bProductGalleryItem[] = []
  for (const raw of urls) {
    const url = raw.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    const index = items.length
    items.push({
      id: index === 0 ? "mockup_front" : `mockup_${index + 1}`,
      label: index === 0 ? "Front" : `View ${index + 1}`,
      url,
      kind: "mockup",
    })
  }
  return items
}

export async function syncS2bDesignPreviewForMcProduct(
  storeCore: StoreCoreModuleService,
  input: SyncS2bDesignPreviewInput
): Promise<SyncS2bDesignPreviewResult> {
  const rows = await storeCore.listProducts({ id: input.productId, store_id: input.storeId })
  const product = rows[0] as Record<string, unknown> | undefined
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND")
  }

  const s2bProductId = resolveS2bProductId(product, input.s2bProductId)
  let mockups: S2bProductGalleryItem[] = []

  if (Array.isArray(input.mockupUrls) && input.mockupUrls.length) {
    mockups = mockupsFromUrls(input.mockupUrls)
  } else if (s2bProductId && !isS2bdiyMockMode() && getS2bdiyConfig()) {
    const client = new S2bdiyClient(getS2bdiyConfig()!)
    const detail = await getProductDetail(client, s2bProductId)
    mockups = extractProductMockupGalleryFromS2bDetail(detail)
  } else if (s2bProductId && isS2bdiyMockMode()) {
    throw new Error("S2BDIY_MOCK_MODE_ACTIVE")
  } else {
    throw new Error("S2B_PRODUCT_ID_REQUIRED")
  }

  if (!mockups.length) {
    throw new Error("S2B_MOCKUP_NOT_FOUND")
  }

  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const gallery = mergeProductGalleryWithS2bMockups(metadata.gallery, mockups)
  const mockupImageUrl = mockups[0]?.url ?? null

  const updateData: Record<string, unknown> = {
    mockup_image_url: mockupImageUrl,
    image_url: mockupImageUrl ?? product.image_url,
    metadata: {
      ...metadata,
      gallery,
      s2b_design_synced_at: new Date().toISOString(),
      s2b_sdk_saved: true,
    },
  }

  if (s2bProductId) {
    updateData.supplier_product_id = s2bProductId
    updateData.supplier_id = product.supplier_id ?? "sup_s2bdiy"
  }

  await storeCore.updateProducts({
    selector: { id: input.productId },
    data: updateData,
  })

  return {
    supplier_product_id: s2bProductId,
    mockup_image_url: mockupImageUrl,
    gallery,
  }
}
