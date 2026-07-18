import type StoreCoreModuleService from "../../modules/store-core/service"
import { getS2bdiyAccessToken } from "../../modules/suppliers/s2bdiy/s2bdiy-auth"
import { getS2bdiyConfig, isS2bdiyMockMode } from "../../modules/suppliers/s2bdiy/config"
import { ensureRealS2bDesignAssets } from "./ensure-real-s2b-design-assets"
import { isCatalogSupplierProductId } from "./retry-product-provision"

export type S2bEditorMode = "new" | "redesign"

export type ProductDesignConfig = {
  sdk_base_url: string
  token: string
  basic_product_id: string
  s2b_product_id: string | null
  size_id: string | null
  color_id: string | null
  view_id: string | null
  material_id: string | null
  design_type: number
  editor_mode: S2bEditorMode
  redesign_mode: boolean
  designer_url: string
  assets_refreshed?: boolean
  /** Present when opening an existing buyer My Design draft (Continue editing). */
  saved_design?: {
    mc_product_id: string
    medusa_variant_id: string | null
    title: string
    mockup_url: string | null
    price: number | null
    supplier_product_id: string | null
    basic_product_id: string | null
    blank_product_id: string | null
    size_id: string | null
    color_id: string | null
    size_name: string | null
    color_name: string | null
    editor_path: string
  } | null
}

export function isMockS2bProvision(product: Record<string, unknown>): boolean {
  if (isS2bdiyMockMode()) return true
  const materialId = product.supplier_material_id
  return typeof materialId === "string" && materialId.startsWith("mock_")
}

export async function resolveBasicProductIdForMcProduct(
  storeCore: StoreCoreModuleService,
  product: Record<string, unknown>
): Promise<string | null> {
  const fromProduct =
    typeof product.basic_product_id === "string" && product.basic_product_id.trim()
      ? product.basic_product_id.trim()
      : null
  if (fromProduct) return fromProduct

  const supplierProductId =
    typeof product.supplier_product_id === "string" ? product.supplier_product_id : null
  if (!supplierProductId || !isCatalogSupplierProductId(supplierProductId)) {
    return process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ?? null
  }

  const spRows = await storeCore.listSupplierProducts({ id: supplierProductId })
  const sp = spRows[0] as Record<string, unknown> | undefined
  if (sp?.basic_product_id != null) {
    return String(sp.basic_product_id)
  }
  return process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ?? null
}

export function resolveS2bProductId(product: Record<string, unknown>): string | null {
  const supplierProductId =
    typeof product.supplier_product_id === "string" ? product.supplier_product_id : null
  if (!supplierProductId || isCatalogSupplierProductId(supplierProductId)) {
    return null
  }
  return /^\d+$/.test(supplierProductId) ? supplierProductId : null
}

export function resolveS2bEditorMode(
  product: Record<string, unknown>,
  s2bProductId: string | null
): S2bEditorMode {
  if (!s2bProductId || isMockS2bProvision(product)) {
    return "new"
  }

  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  // Buyer Studio saves / seller SDK saves already have a real designed product on S2B.
  if (
    metadata.s2b_sdk_saved === true ||
    metadata.buyer_design === true ||
    metadata.design_source === "buyer_sdk"
  ) {
    return "redesign"
  }

  // Real quickCreate/API products already contain the uploaded print design.
  if (
    product.supplier_material_id &&
    !String(product.supplier_material_id).startsWith("mock_")
  ) {
    return "redesign"
  }

  // Numeric S2B designed-product id without material row (common for buyer DIY drafts).
  if (/^\d+$/.test(s2bProductId)) {
    return "redesign"
  }

  return "new"
}

export function buildS2bdiyDesignerUrl(config: {
  sdkBaseUrl: string
  token: string
  basicProductId?: string | null
  s2bProductId?: string | number | null
  sizeId?: string | number | null
  colorId?: string | number | null
  viewId?: string | number | null
  materialId?: string | number | null
  designType?: number | null
  editorMode?: S2bEditorMode
}): string {
  const base = config.sdkBaseUrl.replace(/\/$/, "")
  const params = new URLSearchParams({ token: config.token })
  const editorMode = config.editorMode ?? (config.s2bProductId ? "redesign" : "new")

  if (editorMode === "redesign" && config.s2bProductId) {
    params.set("productId", String(config.s2bProductId))
  } else {
    if (config.basicProductId) params.set("basicProductId", String(config.basicProductId))
    if (config.sizeId != null && String(config.sizeId).trim()) {
      params.set("sizeId", String(config.sizeId))
    }
    if (config.colorId != null && String(config.colorId).trim()) {
      params.set("colorId", String(config.colorId))
    }
    if (config.viewId != null && String(config.viewId).trim()) {
      params.set("viewId", String(config.viewId))
    }
    if (config.materialId != null && String(config.materialId).trim()) {
      params.set("materialId", String(config.materialId))
    }
    if (config.designType != null && Number.isFinite(Number(config.designType))) {
      params.set("designType", String(config.designType))
    }
  }

  return `${base}/singleDesign?${params.toString()}`
}

export async function buildProductDesignConfig(
  storeCore: StoreCoreModuleService,
  product: Record<string, unknown>,
  options?: { productId?: string; storeId?: string }
): Promise<ProductDesignConfig> {
  let resolvedProduct = product
  let assetsRefreshed = false

  if (options?.productId && options?.storeId) {
    const ensured = await ensureRealS2bDesignAssets(
      storeCore,
      options.productId,
      options.storeId,
      product
    )
    resolvedProduct = ensured.product
    assetsRefreshed = ensured.refreshed
  }

  const basicProductId = await resolveBasicProductIdForMcProduct(storeCore, resolvedProduct)
  if (!basicProductId) {
    throw new Error("DESIGNER_NOT_SUPPORTED")
  }

  const s2bProductId = resolveS2bProductId(resolvedProduct)
  const sizeId =
    resolvedProduct.supplier_size_id != null && String(resolvedProduct.supplier_size_id).trim()
      ? String(resolvedProduct.supplier_size_id)
      : process.env.S2BDIY_TEST_SIZE_ID ?? null
  const colorId =
    resolvedProduct.supplier_color_id != null && String(resolvedProduct.supplier_color_id).trim()
      ? String(resolvedProduct.supplier_color_id)
      : process.env.S2BDIY_TEST_COLOR_ID ?? null
  const viewId =
    resolvedProduct.view_id != null && String(resolvedProduct.view_id).trim()
      ? String(resolvedProduct.view_id)
      : process.env.S2BDIY_TEST_VIEW_ID ?? null
  const materialId =
    resolvedProduct.supplier_material_id != null &&
    String(resolvedProduct.supplier_material_id).trim()
      ? String(resolvedProduct.supplier_material_id)
      : null
  const designType = Number(resolvedProduct.design_type ?? 1) || 1
  const editorMode = resolveS2bEditorMode(resolvedProduct, s2bProductId)

  const s2bConfig = getS2bdiyConfig()
  if (!s2bConfig) {
    throw new Error("S2BDIY_CREDENTIALS_REQUIRED")
  }

  let token: string
  try {
    token = await getS2bdiyAccessToken(s2bConfig)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(message.includes("AppKey") ? "S2BDIY_CREDENTIALS_INVALID" : "SUPPLIER_AUTH_FAILED")
  }

  const isTest = s2bConfig.apiBaseUrl.includes("test") || s2bConfig.apiBaseUrl.includes("sandbox")
  const sdkBaseUrl = isTest ? "https://opensdktest.s2bdiy.com" : "https://opensdk.s2bdiy.com"

  const designerUrl = buildS2bdiyDesignerUrl({
    sdkBaseUrl,
    token,
    basicProductId,
    s2bProductId,
    sizeId,
    colorId,
    viewId,
    materialId:
      editorMode === "new" && materialId && !materialId.startsWith("mock_") ? materialId : null,
    designType,
    editorMode,
  })

  const metadata = (resolvedProduct.metadata ?? {}) as Record<string, unknown>
  const isBuyerDesign =
    metadata.buyer_design === true || metadata.design_source === "buyer_sdk"
  const medusaVariantId =
    typeof resolvedProduct.medusa_variant_id === "string" && resolvedProduct.medusa_variant_id.trim()
      ? resolvedProduct.medusa_variant_id.trim()
      : null
  const savedDesign =
    isBuyerDesign || (editorMode === "redesign" && medusaVariantId)
      ? {
          mc_product_id: String(resolvedProduct.id ?? options?.productId ?? ""),
          medusa_variant_id: medusaVariantId,
          title:
            typeof resolvedProduct.title === "string" && resolvedProduct.title.trim()
              ? resolvedProduct.title.trim()
              : "Custom Design",
          mockup_url:
            (typeof resolvedProduct.mockup_image_url === "string" &&
              resolvedProduct.mockup_image_url.trim()) ||
            (typeof resolvedProduct.image_url === "string" && resolvedProduct.image_url.trim()) ||
            null,
          price: typeof resolvedProduct.price === "number" ? resolvedProduct.price : null,
          supplier_product_id: s2bProductId,
          basic_product_id: basicProductId,
          blank_product_id:
            typeof metadata.blank_product_id === "string" && metadata.blank_product_id.trim()
              ? metadata.blank_product_id.trim()
              : null,
          size_id: sizeId,
          color_id: colorId,
          size_name:
            typeof metadata.size_name === "string" && metadata.size_name.trim()
              ? metadata.size_name.trim()
              : null,
          color_name:
            typeof metadata.color_name === "string" && metadata.color_name.trim()
              ? metadata.color_name.trim()
              : null,
          editor_path: `/design/${encodeURIComponent(String(resolvedProduct.id ?? options?.productId ?? ""))}`,
        }
      : null

  return {
    sdk_base_url: sdkBaseUrl,
    token,
    basic_product_id: basicProductId,
    s2b_product_id: editorMode === "redesign" ? s2bProductId : null,
    size_id: sizeId,
    color_id: colorId,
    view_id: viewId,
    material_id:
      editorMode === "new" && materialId && !materialId.startsWith("mock_") ? materialId : null,
    design_type: designType,
    editor_mode: editorMode,
    redesign_mode: editorMode === "redesign",
    designer_url: designerUrl,
    assets_refreshed: assetsRefreshed || undefined,
    saved_design: savedDesign,
  }
}
