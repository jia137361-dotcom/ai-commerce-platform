import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getStoreCoreService,
  createMcProduct,
  sendError,
  requireText,
} from "../../../_helpers/store-core"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { convertCnyToUsd } from "../../../../lib/pricing"
import { normalizeShipFromCountryCode } from "../../../../lib/ship-from-country"
import { getBasicProduct } from "../../../../modules/suppliers/s2bdiy/s2bdiy-product"

type CreateDraftBody = {
  supplier_product_id: string
  basic_product_id: string
  category_ids?: string[]
}

const S2B_MARKUP = 2.3

const readRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const readString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null)

const priceFromCny = (value: unknown, fallback = 29.99) => {
  const cny = Number(value)
  if (!Number.isFinite(cny) || cny <= 0) return fallback
  return Math.max(1, Math.round(convertCnyToUsd(cny) * S2B_MARKUP * 100) / 100)
}

const imageSrc = (value: unknown) => {
  const row = readRecord(value)
  const src = readString(row.big_src) ?? readString(row.src) ?? readString(value)
  return src && /^https?:\/\//i.test(src) ? src : null
}

const hasSupplierColorImages = (value: unknown) => {
  if (!Array.isArray(value)) return false
  return value.some((block) => {
    const row = readRecord(block)
    return row.color_id != null && Array.isArray(row.images) && row.images.some(imageSrc)
  })
}

const readColorImages = (sp: Record<string, unknown>, rawOverride?: Record<string, unknown>) => {
  const raw = rawOverride ?? readRecord(sp.raw_json)
  const blocks = [
    ...(Array.isArray(raw.product_show_images) ? raw.product_show_images : []),
    ...(Array.isArray(raw.show_images) ? raw.show_images : []),
  ]
  const colors = Array.isArray(raw.colors) ? raw.colors.map(readRecord) : []
  return blocks.flatMap((block) => {
    const row = readRecord(block)
    const colorId = String(row.color_id ?? "")
    const colorName =
      readString(row.color_name) ??
      readString(colors.find((color) => String(color.id ?? "") === colorId)?.name) ??
      "Default"
    const images = Array.isArray(row.images)
      ? row.images.map(imageSrc).filter((url): url is string => Boolean(url))
      : []
    return colorId && images.length ? [{ color_id: colorId, color_name: colorName, images }] : []
  })
}

const readCategoryPath = (sp: Record<string, unknown>, rawOverride?: Record<string, unknown>) => {
  const raw = rawOverride ?? readRecord(sp.raw_json)
  const rows = Array.isArray(raw.categorys) ? raw.categorys : []
  return rows.flatMap((value) => {
    const row = readRecord(value)
    const label = readString(row.en_name) ?? readString(row.name)
    return label ? [label] : []
  })
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

    let supplierRaw = readRecord(sp.raw_json)
    if (!hasSupplierColorImages(supplierRaw.product_show_images) && sp.supplier_id === "sup_s2bdiy") {
      try {
        const fresh = await getBasicProduct(Number(basicProductId))
        supplierRaw = {
          ...supplierRaw,
          ...(fresh as unknown as Record<string, unknown>),
        }
        await storeCoreService.updateSupplierProducts({
          selector: { id: supplierProductId },
          data: { raw_json: supplierRaw },
        } as never)
      } catch {
        // Keep the existing supplier snapshot if the remote catalog is temporarily unavailable.
      }
    }

    // Calculate retail price from S2BDIY CNY purchase price using the fixed 2.3x markup.
    const purchasePriceCny = Number(sp.purchase_price) || 0
    const retailPriceUsd = priceFromCny(purchasePriceCny)
    const colorImages = readColorImages(sp, supplierRaw)
    const allImages = Array.from(new Set([
      ...colorImages.flatMap((entry) => entry.images),
      readString(sp.product_show_master_image),
    ].filter((url): url is string => Boolean(url))))
    const categoryPath = readCategoryPath(sp, supplierRaw)
    const shipFromCountry = normalizeShipFromCountryCode(sp.produce_country) ?? normalizeShipFromCountryCode(sp.warehouse_name)

    // Build variant rows for mc_product
    const variantRows = (variants as any[]).map((v: any) => ({
      supplier_variant_id: String(v.supplier_variant_id ?? v.id),
      supplier_size_id: v.supplier_size_id,
      supplier_color_id: v.supplier_color_id,
      color: v.color_name ?? v.color ?? "Default",
      size: v.size_name ?? v.size ?? "Default",
      price: priceFromCny(v.cost ?? sp.purchase_price, retailPriceUsd),
      cost: Number(v.cost) || 0,
      weight: Number(v.weight) || null,
      supplier_sku: v.sku ?? null,
      image_url: colorImages.find((entry) => entry.color_id === String(v.supplier_color_id))?.images[0] ?? allImages[0] ?? null,
      enabled: true,
      stock: 50,
    }))

    const draftData = {
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
      image_url: allImages[0] ?? sp.product_show_master_image,
      mockup_image_url: allImages[0] ?? sp.product_show_master_image,
      variants: variantRows,
      ship_from_country: shipFromCountry,
      metadata: {
        synced_from_supplier: true,
        import_source: "s2bdiy_supplier",
        supplier_name: sp.name,
        purchase_price_cny: purchasePriceCny,
        retail_price_usd: retailPriceUsd,
        category_level_1: categoryPath[0] ?? null,
        category_level_2: categoryPath[1] ?? null,
        product_type: sp.basic_product_en_name ?? sp.name ?? null,
        category_path: categoryPath,
        warehouse_region: sp.warehouse_name ?? sp.produce_country ?? shipFromCountry ?? null,
        sellable_country_codes: shipFromCountry ? [shipFromCountry] : [],
        source_product_id: basicProductId,
        image_urls: allImages,
        s2b_color_images: colorImages,
      },
    }

    const existing = await storeCoreService.listProducts({
      store_id: storeId,
      supplier_id: sp.supplier_id,
      basic_product_id: basicProductId,
    } as never)
    const current = existing[0] as Record<string, unknown> | undefined
    const currentMeta = current && typeof current.metadata === "object" && current.metadata ? current.metadata : {}
    let product
    if (current?.id) {
      const isPublished = current.status === "published"
      const updateData = {
        ...draftData,
        title: isPublished ? current.title : draftData.title,
        description: isPublished ? current.description : draftData.description,
        status: current.status,
        metadata: {
          ...currentMeta,
          ...draftData.metadata,
        },
      }
      const updated = await storeCoreService.updateProducts({
        selector: { id: current.id, store_id: storeId },
        data: updateData,
      } as never)
      product = Array.isArray(updated) ? updated[0] : updated
    } else {
      product = await createMcProduct(storeCoreService, draftData)
    }

    return res.status(201).json({
      message: current?.id ? "Product draft updated from supplier product" : "Product draft created from supplier product",
      product_id: (product as any).id,
    })
  } catch (error: any) {
    return sendError(res, 500, "VALIDATION_ERROR", `Failed to create draft: ${error.message}`)
  }
}
