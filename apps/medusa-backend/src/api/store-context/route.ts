import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../lib/store-context"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    store_context: resolveCurrentStore(req)
  })
}

