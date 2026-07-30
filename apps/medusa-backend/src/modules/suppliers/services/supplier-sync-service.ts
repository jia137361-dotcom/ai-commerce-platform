import type StoreCoreModuleService from "../../store-core/service"
import { requireSupplierAdapter } from "../registry"
import type { SyncData } from "../adapter"

export type SyncContext = {
  storeCoreService: StoreCoreModuleService
  storeId?: string
}

// Ensure a product category exists for the given S2BDIY category, return its ID
async function ensureCategory(
  storeCoreService: StoreCoreModuleService,
  storeId: string,
  s2bCategory: { id: number; name: string; en_name?: string }
): Promise<string> {
  // Check if category already exists with this supplier_category_id
  const existing = (await storeCoreService.listProductCategories({
    store_id: storeId,
  } as any)) as any[]

  const match = existing.find((c: any) => c.supplier_category_id === String(s2bCategory.id))
  if (match) return match.id

  const name = s2bCategory.en_name || s2bCategory.name || `Category ${s2bCategory.id}`
  const slug = (s2bCategory.en_name || `cat-${s2bCategory.id}`)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  // Check by slug to avoid duplicates
  const bySlug = existing.find((c: any) => c.slug === slug)
  if (bySlug) {
    // Update with supplier_category_id if missing
    if (!bySlug.supplier_category_id) {
      await storeCoreService.updateProductCategories({
        selector: { id: bySlug.id },
        data: { supplier_category_id: String(s2bCategory.id) } as any,
      })
    }
    return bySlug.id
  }

  const created = await storeCoreService.createProductCategories({
    store_id: storeId,
    name,
    slug,
    description: s2bCategory.name !== name ? s2bCategory.name : null,
  } as any)

  // Set supplier_category_id (column exists in DB but may not be in model)
  try {
    await storeCoreService.updateProductCategories({
      selector: { id: created.id },
      data: { supplier_category_id: String(s2bCategory.id) } as any,
    })
  } catch {
    // Column might not be in the ORM model yet, ignore
  }

  return created.id
}

export async function syncBasicProduct(
  basicProductId: number,
  supplierId: string,
  { storeCoreService, storeId }: SyncContext
) {
  const adapter = requireSupplierAdapter(supplierId)
  const data = await adapter.syncProduct(basicProductId)

  // Upsert supplier product
  const existing = await storeCoreService.listSupplierProducts({
    basic_product_id: String(basicProductId),
  })

  const supplierProductData = {
    supplier_id: supplierId,
    basic_product_id: String(data.id),
    basic_product_code: (data as any).code ?? null,
    basic_product_name: data.name ?? null,
    basic_product_en_name: data.en_name ?? null,
    name: data.name ?? `Basic Product ${data.id}`,
    category: "apparel",
    purchase_price: Number(data.purchase_price) || null,
    product_show_master_image: data.product_show_master_image ?? null,
    produce_country: data.produce_country ?? null,
    warehouse_name: data.warehouse_name ?? null,
    deliver_goods_text: data.deliver_goods_text ?? null,
    base_cost: Number(data.purchase_price) || 0,
    // Keep the complete supplier response so English detail fields and all image
    // URLs remain available without adding vendor-specific columns.
    raw_json: data.raw ?? (data as unknown as Record<string, unknown>),
  }

  let supplierProductId: string

  if (existing.length > 0) {
    await storeCoreService.updateSupplierProducts({
      selector: { id: existing[0].id },
      data: supplierProductData,
    })
    supplierProductId = existing[0].id
  } else {
    const created = await storeCoreService.createSupplierProducts({
      ...supplierProductData,
      supplier_product_id: `s2b_basic_${data.id}`,
      platform_product_id: "",
      status: "active" as const,
      currency: "usd",
    })
    supplierProductId = created.id
  }

  // Sync variants (colors × sizes from items)
  if (data.items?.length) {
    const existingVariants = await storeCoreService.listSupplierProductVariants({
      supplier_product_id: supplierProductId,
    })

    for (const item of data.items) {
      const color = data.colors?.find((c: any) => c.id === item.color_id)
      const size = data.sizes?.find((s: any) => s.id === item.size_id)
      const variantId = `spv_s2b_${data.id}_${item.id}`

      const variantData = {
        supplier_product_id: supplierProductId,
        basic_product_id: String(data.id),
        supplier_variant_id: String(item.id),
        supplier_variant_code: item.code ?? null,
        supplier_size_id: String(item.size_id),
        supplier_color_id: String(item.color_id),
        color: color?.name ?? null,
        size: size?.name ?? null,
        size_name: size?.name ?? null,
        color_name: color?.name ?? null,
        sku: item.code ?? `S2B-${data.id}-${item.id}`,
        cost: Number(item.price) || 0,
        weight: Number(item.weight) || null,
        length: Number(item.length) || null,
        width: Number(item.width) || null,
        height: Number(item.height) || null,
        raw_json: item as unknown as Record<string, unknown>,
      }

      const match = existingVariants.find((v: any) => v.supplier_variant_id === String(item.id))

      if (match) {
        await storeCoreService.updateSupplierProductVariants({
          selector: { id: match.id },
          data: variantData,
        })
      } else {
        await storeCoreService.createSupplierProductVariants({
          id: variantId,
          ...variantData,
          stock_status: "in_stock" as const,
        })
      }
    }
  }

  // Sync print specs (views + print_areas)
  if (data.views?.length) {
    const existingSpecs = await storeCoreService.listSupplierPrintSpecs({
      supplier_product_id: supplierProductId,
    })

    // print_areas are at top level, match by view_id
    const printAreas = data.print_areas ?? []

    for (const view of data.views) {
      const area = printAreas.find((pa: any) => pa.view_id === view.id)

      const specData = {
        supplier_product_id: supplierProductId,
        basic_product_id: String(data.id),
        view_id: String(view.id),
        view_name: view.name ?? null,
        view_en_name: view.en_name ?? null,
        print_position: view.name ?? "front",
        print_file_width: Number(area?.width) || 0,
        print_file_height: Number(area?.height) || 0,
        design_area_width: Number(area?.width) || null,
        design_area_height: Number(area?.height) || null,
        design_area_unit: "px" as const,
        design_type: 1,
        tip_level: String(view.tip_level ?? ""),
        dpi: 300,
      }

      const match = existingSpecs.find((s: any) => s.view_id === String(view.id))

      if (match) {
        await storeCoreService.updateSupplierPrintSpecs({
          selector: { id: match.id },
          data: specData,
        })
      } else {
        await storeCoreService.createSupplierPrintSpecs({
          ...specData,
          accepted_formats: ["png", "jpg", "jpeg"],
          status: "active" as const,
        })
      }
    }
  }

  // Sync categories from S2BDIY
  const categoryIds: string[] = []
  if (data.categorys?.length && storeId) {
    for (const s2bCat of data.categorys) {
      try {
        const catId = await ensureCategory(storeCoreService, storeId, s2bCat)
        categoryIds.push(catId)
      } catch {
        // Skip category sync errors
      }
    }
  }

  return {
    supplier_product_id: supplierProductId,
    basic_product_id: data.id,
    variant_count: data.items?.length ?? 0,
    view_count: data.views?.length ?? 0,
    category_ids: categoryIds,
  }
}
