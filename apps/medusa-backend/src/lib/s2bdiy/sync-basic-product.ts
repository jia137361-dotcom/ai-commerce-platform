import type StoreCoreModuleService from "../../modules/store-core/service"
import { S2BDIY_SUPPLIER_ID } from "./index"
import { S2bdiyClient } from "./s2bdiy-client"
import { requireS2bdiyConfig } from "./config"
import { getBasicProductDetail } from "./s2bdiy-product"

const readArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

export async function syncBasicProductFromS2bdiy(
  storeCore: StoreCoreModuleService,
  input: { basicProductId: string | number; platformProductId: string; supplierProductRowId?: string }
): Promise<{ supplier_product_id: string; variants: number; print_specs: number }> {
  const config = requireS2bdiyConfig()
  const client = new S2bdiyClient(config)
  const detail = await getBasicProductDetail(client, input.basicProductId)
  const basicId = String(detail.id ?? input.basicProductId)

  const spRowId = input.supplierProductRowId ?? `sp_s2b_${basicId}`
  const existing = await storeCore.listSupplierProducts({ id: spRowId })
  const payload = {
    id: spRowId,
    supplier_id: S2BDIY_SUPPLIER_ID,
    supplier_product_id: `basic_${basicId}`,
    platform_product_id: input.platformProductId,
    basic_product_id: basicId,
    basic_product_code: String(detail.code ?? ""),
    basic_product_name: String(detail.name ?? detail.cn_name ?? `S2B ${basicId}`),
    basic_product_en_name: String(detail.en_name ?? ""),
    name: String(detail.name ?? detail.cn_name ?? `S2B Basic ${basicId}`),
    category: String(detail.category ?? "apparel"),
    base_cost: Number(detail.purchase_price ?? detail.price ?? 0),
    purchase_price: Number(detail.purchase_price ?? detail.price ?? 0),
    product_show_master_image:
      typeof detail.product_show_images === "string"
        ? detail.product_show_images
        : Array.isArray(detail.product_show_images)
          ? String((detail.product_show_images as unknown[])[0] ?? "")
          : null,
    produce_country: String(detail.produce_country ?? ""),
    warehouse_name: String(detail.warehouse_name ?? ""),
    deliver_goods_text: String(detail.deliver_goods_text ?? ""),
    status: "active" as const,
    raw_json: detail,
  }

  if (existing.length) {
    await storeCore.updateSupplierProducts({ selector: { id: spRowId }, data: payload })
  } else {
    await storeCore.createSupplierProducts(payload)
  }

  const oldVariants = await storeCore.listSupplierProductVariants({ supplier_product_id: spRowId })
  for (const v of oldVariants) {
    try {
      await storeCore.deleteSupplierProductVariants(v.id)
    } catch {
      // idempotent re-sync
    }
  }
  const oldSpecs = await storeCore.listSupplierPrintSpecs({ supplier_product_id: spRowId })
  for (const s of oldSpecs) {
    try {
      await storeCore.deleteSupplierPrintSpecs(s.id)
    } catch {
      // idempotent re-sync
    }
  }

  let variantCount = 0
  for (const item of readArray(detail.items)) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const sizeId = row.size_id
    const colorId = row.color_id
    const colors = readArray(detail.colors) as Record<string, unknown>[]
    const sizes = readArray(detail.sizes) as Record<string, unknown>[]
    const colorName = colors.find((c) => String(c.id) === String(colorId))?.name
    const sizeName = sizes.find((s) => String(s.id) === String(sizeId))?.name
    const variantRowId = `spv_s2b_${basicId}_${row.id}`
    await storeCore.createSupplierProductVariants({
      id: variantRowId,
      supplier_product_id: spRowId,
      supplier_variant_id: String(row.id ?? variantRowId),
      supplier_size_id: sizeId != null ? String(sizeId) : null,
      supplier_color_id: colorId != null ? String(colorId) : null,
      color: colorName != null ? String(colorName) : null,
      size: sizeName != null ? String(sizeName) : null,
      sku: String(row.code ?? row.sku ?? `S2B-${basicId}-${row.id}`),
      cost: Number(row.price ?? 0),
      weight: Number(row.weight ?? 0),
      length: Number(row.length ?? 0),
      width: Number(row.width ?? 0),
      height: Number(row.height ?? 0),
      stock_status: "in_stock",
      raw_json: row,
    })
    variantCount++
  }

  let specCount = 0
  const views = readArray(detail.views) as Record<string, unknown>[]
  const printAreas = readArray(detail.print_areas) as Record<string, unknown>[]
  for (const view of views) {
    const viewId = String(view.id ?? "")
    const area = printAreas.find((p) => String((p as Record<string, unknown>).view_id) === viewId) as
      | Record<string, unknown>
      | undefined
    const specId = `sps_s2b_${basicId}_${viewId}`
    await storeCore.createSupplierPrintSpecs({
      id: specId,
      supplier_product_id: spRowId,
      supplier_variant_id: null,
      view_id: viewId,
      view_name: String(view.name ?? ""),
      view_en_name: String(view.en_name ?? ""),
      design_area_width: area ? Number(area.width ?? 0) : 0,
      design_area_height: area ? Number(area.height ?? 0) : 0,
      design_area_unit: "px",
      design_type: 1,
      print_position: String(view.en_name ?? view.name ?? viewId),
      print_file_width: area ? Number(area.width ?? 4500) : 4500,
      print_file_height: area ? Number(area.height ?? 5400) : 5400,
      dpi: 300,
      accepted_formats: ["png", "jpg", "jpeg"],
      background_required: false,
      color_mode: "RGB",
      status: "active",
    })
    specCount++
  }

  return { supplier_product_id: spRowId, variants: variantCount, print_specs: specCount }
}
