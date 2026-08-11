import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { buildS2bExportCsv } from "../../../../lib/s2b-product-import/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const body = (req.body ?? {}) as {
    source_product_ids?: Array<string | number>
    supplier_id?: string
  }
  const sourceProductIds = (body.source_product_ids ?? [])
    .map((value) => String(value).trim())
    .filter(Boolean)

  if (!sourceProductIds.length) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "source_product_ids is required" },
    })
  }

  try {
    const csv = await buildS2bExportCsv({
      container: req.scope,
      storeId,
      sourceProductIds,
      supplierId: body.supplier_id,
    })
    return res.status(200).json({
      csv,
      filename: `s2bdiy-products-${new Date().toISOString().slice(0, 10)}.csv`,
    })
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "S2B_EXPORT_FAILED",
        message: error instanceof Error ? error.message : "Unable to export CSV",
      },
    })
  }
}
