import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getStoreCoreService,
  createMcProduct,
  sendError,
  requireText,
} from "../../../_helpers/store-core"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { calculateRetailPriceUsd } from "../../../../lib/pricing"

type CreateDraftBody = {
  supplier_product_id: string
  basic_product_id: string
  category_ids?: string[]
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as CreateDraftBody
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

    // Calculate retail price from CNY purchase price
    const purchasePriceCny = Number(sp.purchase_price) || 0
    const retailPriceUsd = purchasePriceCny > 0 ? calculateRetailPriceUsd(purchasePriceCny) : 29.99

    // Build variant rows for mc_product
    const variantRows = (variants as any[]).map((v: any) => ({
      supplier_variant_id: v.id,
      supplier_size_id: v.supplier_size_id,
      supplier_color_id: v.supplier_color_id,
      color: v.color_name ?? v.color ?? "Default",
      size: v.size_name ?? v.size ?? "Default",
      price: retailPriceUsd,
      stock: 50,
    }))

    // Create mc_product draft
    const product = await createMcProduct(storeCoreService, {
      store_id: storeId,
      title: String(sp.name ?? `Product ${basicProductId}`),
      description: "",
      status: "draft",
      source: "manual",
      price: retailPriceUsd,
      cost: purchasePriceCny,
      tags: [],
      category_ids: body.category_ids ?? [],
      supplier_id: sp.supplier_id,
      basic_product_id: basicProductId,
      platform_product_id: String(sp.supplier_product_id ?? ""),
      supplier_product_id: String(sp.id),
      image_url: sp.product_show_master_image,
      mockup_image_url: sp.product_show_master_image,
      variants: variantRows,
      metadata: {
        synced_from_supplier: true,
        supplier_name: sp.name,
        purchase_price_cny: purchasePriceCny,
        retail_price_usd: retailPriceUsd,
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
