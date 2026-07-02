import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getStoreCoreService,
  normalizePlatformProduct
} from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeCoreService = getStoreCoreService(req)
  const platformProducts = await storeCoreService.listPlatformProducts(
    { status: "active" },
    { order: { title: "ASC" } }
  )

  return res.json({
    count: platformProducts.length,
    platform_products: platformProducts.map(normalizePlatformProduct)
  })
}
