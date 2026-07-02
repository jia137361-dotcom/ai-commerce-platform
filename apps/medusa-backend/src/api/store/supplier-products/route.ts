import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getStoreCoreService,
  normalizePlatformDesignTemplate,
  normalizeSupplierPrintSpec,
  normalizeSupplierProduct,
  normalizeSupplierProductVariant
} from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const platformProductId =
    typeof req.query.platform_product_id === "string"
      ? req.query.platform_product_id
      : undefined
  const storeCoreService = getStoreCoreService(req)
  const supplierProducts = await storeCoreService.listSupplierProducts(
    {
      status: "active",
      ...(platformProductId ? { platform_product_id: platformProductId } : {})
    },
    { order: { name: "ASC" } }
  )
  const supplierProductIds = supplierProducts.map((product: any) => product.id)
  const variants = supplierProductIds.length
    ? await storeCoreService.listSupplierProductVariants({
        supplier_product_id: supplierProductIds
      })
    : []
  const printSpecs = supplierProductIds.length
    ? await storeCoreService.listSupplierPrintSpecs({
        supplier_product_id: supplierProductIds,
        status: "active"
      })
    : []
  const platformProductIds = Array.from(
    new Set(supplierProducts.map((product: any) => product.platform_product_id))
  )
  const designTemplates = platformProductIds.length
    ? await storeCoreService.listPlatformDesignTemplates({
        platform_product_id: platformProductIds,
        status: "active"
      })
    : []

  return res.json({
    count: supplierProducts.length,
    supplier_products: supplierProducts.map((product: any) => ({
      ...normalizeSupplierProduct(product),
      variants: variants
        .filter((variant: any) => variant.supplier_product_id === product.id)
        .map(normalizeSupplierProductVariant),
      print_specs: printSpecs
        .filter((spec: any) => spec.supplier_product_id === product.id)
        .map(normalizeSupplierPrintSpec),
      design_templates: designTemplates
        .filter(
          (template: any) =>
            template.platform_product_id === product.platform_product_id
        )
        .map(normalizePlatformDesignTemplate)
    }))
  })
}
