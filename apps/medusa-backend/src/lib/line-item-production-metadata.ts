import type StoreCoreModuleService from "../modules/store-core/service"

export type LineItemProductionMetadata = {
  mc_product_id: string | null
  supplier_id: string | null
  /**
   * `mc_product.supplier_product_id`:
   * - draft-time: catalog row id (e.g. sp_tshirt)
   * - after S2BDIY provisioning: S2BDIY quickCreate product_id (for fulfillment)
   */
  supplier_product_id: string | null
  supplier_variant_id: string | null
  basic_product_id: string | null
  supplier_size_id: string | null
  supplier_color_id: string | null
  print_file_url: string | null
  print_position: string | null
  color: string | null
  size: string | null
}

export async function buildLineItemProductionMetadata(
  storeCoreService: StoreCoreModuleService,
  linkedProduct: Record<string, unknown>
): Promise<LineItemProductionMetadata> {
  const supplierVariantId =
    typeof linkedProduct.supplier_variant_id === "string"
      ? linkedProduct.supplier_variant_id
      : null

  let color: string | null = null
  let size: string | null = null
  let printPosition: string | null = null

  if (supplierVariantId) {
    const variants = await storeCoreService.listSupplierProductVariants({
      id: supplierVariantId,
    })
    const variant = variants[0] as Record<string, unknown> | undefined
    if (variant) {
      color = typeof variant.color === "string" ? variant.color : null
      size = typeof variant.size === "string" ? variant.size : null
      const raw = variant.raw_json as Record<string, unknown> | null | undefined
      if (raw && typeof raw.print_position === "string") {
        printPosition = raw.print_position
      }
    }
  }

  if (!printPosition) {
    const supplierProductId =
      typeof linkedProduct.supplier_product_id === "string"
        ? linkedProduct.supplier_product_id
        : null
    if (supplierProductId) {
      const specs = await storeCoreService.listSupplierPrintSpecs({
        // For Dev1 catalog sync, specs are tied to supplier product rows.
        // If this product has been provisioned and supplier_product_id is no longer a row id,
        // the spec lookup will just return empty and we fall back to "front".
        supplier_product_id: supplierProductId,
        status: "active",
      })
      const spec = specs[0] as Record<string, unknown> | undefined
      if (spec && typeof spec.print_position === "string") {
        printPosition = spec.print_position
      }
    }
  }

  const basicProductId = linkedProduct.basic_product_id
  const supplierSizeId = linkedProduct.supplier_size_id
  const supplierColorId = linkedProduct.supplier_color_id

  return {
    mc_product_id: typeof linkedProduct.id === "string" ? linkedProduct.id : null,
    supplier_id:
      typeof linkedProduct.supplier_id === "string" ? linkedProduct.supplier_id : null,
    supplier_product_id:
      typeof linkedProduct.supplier_product_id === "string"
        ? linkedProduct.supplier_product_id
        : null,
    supplier_variant_id: supplierVariantId,
    basic_product_id: typeof basicProductId === "string" ? basicProductId : null,
    supplier_size_id: typeof supplierSizeId === "string" ? supplierSizeId : null,
    supplier_color_id: typeof supplierColorId === "string" ? supplierColorId : null,
    print_file_url:
      typeof linkedProduct.print_file_url === "string"
        ? linkedProduct.print_file_url
        : null,
    print_position: printPosition ?? "front",
    color,
    size,
  }
}
