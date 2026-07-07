import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getStoreCoreService,
  createMcProduct,
  sendError,
  requireText,
} from "../../../_helpers/store-core"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { calculateS2bdiyRecommendedUsdPrice } from "../../../../lib/s2bdiy/pricing"
import {
  buildSupplierProductColorImageMap,
  buildSupplierProductGallery,
} from "../../../../lib/s2bdiy/supplier-product-gallery"

type CreateDraftBody = {
  supplier_product_id: string
  basic_product_id: string
  category_ids?: string[]
}

export const POST = async (req: MedusaRequest<CreateDraftBody>, res: MedusaResponse) => {
  const body = req.body ?? {}
  const supplierProductId = requireText(body.supplier_product_id)
  const basicProductId = requireText(body.basic_product_id)

  if (!supplierProductId || !basicProductId) {
    return sendError(res, 400, "VALIDATION_ERROR", "supplier_product_id and basic_product_id are required")
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  try {
    // Get supplier product data (supplier products are global, not store-scoped)
    const supplierProducts = await storeCoreService.listSupplierProducts({
      id: supplierProductId,
    })

    if (!supplierProducts.length) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Supplier product not found")
    }

    const sp = supplierProducts[0] as Record<string, unknown>

    // Get variants for pricing
    const variants = await storeCoreService.listSupplierProductVariants({
      supplier_product_id: supplierProductId,
    })

    const purchaseCostCny = Number(sp.purchase_price ?? sp.base_cost ?? 0)
    const pricing = calculateS2bdiyRecommendedUsdPrice({
      costCny: Number.isFinite(purchaseCostCny) ? purchaseCostCny : 0,
    })

    const gallery = buildSupplierProductGallery(sp.raw_json, sp.product_show_master_image)
    const colorImages = buildSupplierProductColorImageMap(sp.raw_json)
    const fallbackImage = gallery[0]?.url ?? sp.product_show_master_image

    // Build variant rows for mc_product
    const variantRows = (variants as any[]).map((v: any) => ({
      supplier_variant_id: v.id,
      supplier_size_id: v.supplier_size_id,
      supplier_color_id: v.supplier_color_id,
      color: v.color_name ?? v.color ?? "Default",
      size: v.size_name ?? v.size ?? "Default",
      price: pricing.recommendedPriceUsd || 29.99,
      stock: 50,
      image_url:
        colorImages.get(String(v.supplier_color_id ?? "")) ??
        fallbackImage ??
        null,
    }))

    // Create mc_product draft
    const product = await createMcProduct(storeCoreService, {
      store_id: storeId,
      title: String(sp.name ?? `Product ${basicProductId}`),
      description: "",
      status: "draft",
      source: "manual",
      price: pricing.recommendedPriceUsd || 29.99,
      cost: pricing.costUsd,
      tags: [],
      category_ids: body.category_ids ?? [],
      supplier_id: sp.supplier_id,
      basic_product_id: basicProductId,
      platform_product_id: String(sp.supplier_product_id ?? ""),
      supplier_product_id: String(sp.id),
      image_url: fallbackImage,
      mockup_image_url: fallbackImage,
      variants: variantRows,
      metadata: {
        synced_from_supplier: true,
        catalog_supplier_product_id: String(sp.id),
        supplier_name: sp.name,
        gallery,
        supplier_color_images: Object.fromEntries(colorImages),
        pricing_source: "s2bdiy_purchase_price",
        s2bdiy_pricing: {
          purchase_cost_cny: purchaseCostCny,
          cost_usd: pricing.costUsd,
          shipping_usd: pricing.shippingUsd,
          multiplier: pricing.multiplier,
          exchange_rate: pricing.exchangeRate,
          recommended_price_usd: pricing.recommendedPriceUsd,
        },
      },
    })

    return res.status(201).json({
      message: "Product draft created from supplier product",
      product_id: (product as any).id,
    })
  } catch (error: any) {
    return sendError(res, 500, "VALIDATION_ERROR", `Failed to create draft: ${error.message}`)
  }
}
