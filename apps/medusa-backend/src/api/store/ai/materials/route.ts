/**
 * Buyer AI Design personal materials library.
 *
 * GET /store/ai/materials
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { listBuyerAiMaterials } from "../../../../lib/ai-generation/buyer-generate"
import { getStoreCoreService } from "../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const limit = Number(req.query.limit) || 48
  const materials = await listBuyerAiMaterials(storeCoreService, storeId, limit)
  return res.json({
    materials,
    count: materials.length,
  })
}
