import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

export type LineItemProductionMetadata = {
  mc_product_id: string | null
  supplier_id: string | null
  supplier_product_id: string | null
  supplier_variant_id: string | null
  s2b_designed_product_id: string | null
  s2b_basic_product_id: string | null
  s2b_size_id: string | null
  s2b_color_id: string | null
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
        supplier_product_id: supplierProductId,
        status: "active",
      })
      const spec = specs[0] as Record<string, unknown> | undefined
      if (spec && typeof spec.print_position === "string") {
        printPosition = spec.print_position
      }
    }
  }

  return {
    mc_product_id: typeof linkedProduct.id === "string" ? linkedProduct.id : null,
    supplier_id:
      typeof linkedProduct.supplier_id === "string" ? linkedProduct.supplier_id : null,
    supplier_product_id:
      typeof linkedProduct.supplier_product_id === "string"
        ? linkedProduct.supplier_product_id
        : null,
    supplier_variant_id: supplierVariantId,
    s2b_designed_product_id:
      typeof linkedProduct.s2b_designed_product_id === "string"
        ? linkedProduct.s2b_designed_product_id
        : null,
    s2b_basic_product_id:
      typeof linkedProduct.s2b_basic_product_id === "string"
        ? linkedProduct.s2b_basic_product_id
        : null,
    s2b_size_id:
      typeof linkedProduct.s2b_size_id === "string" ? linkedProduct.s2b_size_id : null,
    s2b_color_id:
      typeof linkedProduct.s2b_color_id === "string" ? linkedProduct.s2b_color_id : null,
    print_file_url:
      typeof linkedProduct.print_file_url === "string"
        ? linkedProduct.print_file_url
        : null,
    print_position: printPosition ?? "front",
    color,
    size,
  }
}
