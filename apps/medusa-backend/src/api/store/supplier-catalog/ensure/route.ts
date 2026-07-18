/**
 * Ensure a designable store blank exists for an S2BDIY basic product.
 *
 * POST /store/supplier-catalog/ensure
 * body: { basic_product_id: number, supplier_id?: string }
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  createMcProduct,
  getStoreCoreService,
  requireText,
  sendError,
} from "../../../_helpers/store-core"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { calculateRetailPriceUsd } from "../../../../lib/pricing"
import { syncBasicProduct } from "../../../../modules/suppliers/services/supplier-sync-service"

const DEFAULT_SUPPLIER_ID = "sup_s2bdiy"

type EnsureBody = {
  basic_product_id?: number | string
  supplier_id?: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as EnsureBody
  const basicProductId = Number(body.basic_product_id)
  if (!Number.isFinite(basicProductId) || basicProductId <= 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "basic_product_id must be a positive number")
  }

  const supplierId = requireText(body.supplier_id) || DEFAULT_SUPPLIER_ID
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  try {
    const sync = await syncBasicProduct(basicProductId, supplierId, {
      storeCoreService,
      storeId,
    })

    const existing = (await storeCoreService.listProducts({
      store_id: storeId,
      basic_product_id: String(basicProductId),
    })) as Array<Record<string, unknown>>

    if (existing.length) {
      const preferred =
        existing.find((row) => row.status === "published") ??
        existing.find((row) => row.status !== "archived") ??
        existing[0]
      return res.json({
        product_id: String(preferred.id),
        supplier_product_id: sync.supplier_product_id,
        basic_product_id: String(basicProductId),
        created: false,
      })
    }

    const supplierProducts = await storeCoreService.listSupplierProducts({
      id: sync.supplier_product_id,
    })
    const sp = supplierProducts[0] as Record<string, unknown> | undefined
    if (!sp) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Supplier product missing after sync")
    }

    const variants = await storeCoreService.listSupplierProductVariants({
      supplier_product_id: sync.supplier_product_id,
    })
    const purchasePriceCny = Number(sp.purchase_price) || 0
    const retailPriceUsd = purchasePriceCny > 0 ? calculateRetailPriceUsd(purchasePriceCny) : 29.99
    const variantRows = (variants as any[]).map((v: any) => ({
      supplier_variant_id: v.id,
      supplier_size_id: v.supplier_size_id,
      supplier_color_id: v.supplier_color_id,
      color: v.color_name ?? v.color ?? "Default",
      size: v.size_name ?? v.size ?? "Default",
      price: retailPriceUsd,
      stock: 50,
    }))

    const product = await createMcProduct(storeCoreService, {
      store_id: storeId,
      title: String(sp.basic_product_en_name || sp.name || `Blank ${basicProductId}`),
      description: "Customize this supply-chain blank in Studio.",
      status: "published",
      source: "manual",
      price: retailPriceUsd,
      cost: purchasePriceCny,
      tags: ["blank", "s2bdiy"],
      category_ids: sync.category_ids ?? [],
      supplier_id: sp.supplier_id,
      basic_product_id: String(basicProductId),
      platform_product_id: String(sp.platform_product_id ?? sp.supplier_product_id ?? ""),
      supplier_product_id: String(sp.id),
      image_url: sp.product_show_master_image,
      mockup_image_url: sp.product_show_master_image,
      variants: variantRows,
      metadata: {
        synced_from_supplier: true,
        catalog_blank: true,
        supplier_name: sp.name,
        purchase_price_cny: purchasePriceCny,
        retail_price_usd: retailPriceUsd,
        external_supplier_product_id: sp.supplier_product_id ?? basicProductId,
      },
    })

    return res.status(201).json({
      product_id: String((product as any).id),
      supplier_product_id: sync.supplier_product_id,
      basic_product_id: String(basicProductId),
      created: true,
    })
  } catch (error: any) {
    return sendError(
      res,
      500,
      "EXTERNAL_SERVICE_ERROR",
      `Failed to open catalog blank: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
