import { getBasicProduct, getProduct } from "../s2bdiy/s2bdiy-product"
import type StoreCoreModuleService from "../../store-core/service"

export type SyncContext = {
  storeCoreService: StoreCoreModuleService
}

export async function syncBasicProduct(
  basicProductId: number,
  supplierId: string,
  { storeCoreService }: SyncContext
) {
  const data = await getBasicProduct(basicProductId)

  // Upsert supplier product
  const existing = await storeCoreService.listSupplierProducts({
    basic_product_id: String(basicProductId),
  })

  const supplierProductData = {
    supplier_id: supplierId,
    basic_product_id: String(data.id),
    basic_product_code: data.code ?? null,
    basic_product_name: data.name ?? null,
    basic_product_en_name: data.en_name ?? null,
    name: data.name ?? `Basic Product ${data.id}`,
    category: "apparel",
    purchase_price: data.purchase_price ?? null,
    product_show_master_image: data.product_show_master_image ?? null,
    produce_country: data.produce_country ?? null,
    warehouse_name: data.warehouse_name ?? null,
    deliver_goods_text: data.deliver_goods_text ?? null,
    base_cost: data.purchase_price ?? 0,
    raw_json: data as unknown as Record<string, unknown>,
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
        cost: item.price ?? 0,
        weight: item.weight ?? null,
        length: item.length ?? null,
        width: item.width ?? null,
        height: item.height ?? null,
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

    for (const view of data.views) {
      const printAreas = view.print_areas ?? []
      const area = printAreas[0]

      const specData = {
        supplier_product_id: supplierProductId,
        basic_product_id: String(data.id),
        view_id: String(view.id),
        view_name: view.name ?? null,
        view_en_name: view.en_name ?? null,
        print_position: view.name ?? "front",
        print_file_width: area?.width ?? 0,
        print_file_height: area?.height ?? 0,
        design_area_width: area?.width ?? null,
        design_area_height: area?.height ?? null,
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

  return {
    supplier_product_id: supplierProductId,
    basic_product_id: data.id,
    variant_count: data.items?.length ?? 0,
    view_count: data.views?.length ?? 0,
  }
}

export async function syncProductDetail(
  supplierProductId: number,
  { storeCoreService }: SyncContext
) {
  const data = await getProduct(supplierProductId)

  // Extract best mockup image
  let mockupUrl: string | null = null

  for (const variant of data.variants ?? []) {
    const imgs = variant.show_images?.[0]?.images
    if (imgs?.length) {
      mockupUrl = imgs[0].src
      break
    }
  }

  if (!mockupUrl) {
    const imgs = data.show_images?.[0]?.images
    if (imgs?.length) {
      mockupUrl = imgs[0].src
    }
  }

  // Update supplier product with mockup
  const citigooProducts = await storeCoreService.listSupplierProducts({
    supplier_product_id: String(supplierProductId),
  })

  if (citigooProducts.length > 0) {
    await storeCoreService.updateSupplierProducts({
      selector: { id: citigooProducts[0].id },
      data: {
        supplier_mockup_image_url: mockupUrl,
        supplier_product_code: data.product_code ?? null,
        supplier_product_name: data.product_name ?? null,
      },
    })
  }

  // Sync variant details
  if (data.variants?.length) {
    const existingVariants = await storeCoreService.listSupplierProductVariants({
      supplier_product_id: citigooProducts[0]?.id,
    })

    for (const variant of data.variants) {
      const match = existingVariants.find(
        (v: any) => v.supplier_size_id === String(variant.size_id) && v.supplier_color_id === String(variant.color_id)
      )

      if (match) {
        await storeCoreService.updateSupplierProductVariants({
          selector: { id: match.id },
          data: {
            size_name: variant.size_name ?? match.size_name,
            color_name: variant.color_name ?? match.color_name,
            weight: variant.weight ?? match.weight,
            length: variant.length ?? match.length,
            width: variant.width ?? match.width,
            height: variant.height ?? match.height,
          },
        })
      }
    }
  }

  return {
    supplier_product_id: supplierProductId,
    supplier_mockup_image_url: mockupUrl,
  }
}
