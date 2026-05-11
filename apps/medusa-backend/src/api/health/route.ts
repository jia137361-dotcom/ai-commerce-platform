import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    status: "ok",
    service: "ai-commerce-medusa-backend"
  })
}

