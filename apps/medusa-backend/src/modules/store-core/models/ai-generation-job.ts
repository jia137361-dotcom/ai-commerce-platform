import { model } from "@medusajs/framework/utils"

const AiGenerationJob = model.define("mc_ai_generation_job", {
  id: model.id({ prefix: "aij" }).primaryKey(),
  store_id: model.text(),
  status: model.enum(["queued", "running", "complete", "failed"]).default("queued"),
  progress: model.number().default(0),
  current_step: model.text().nullable(),
  estimated_seconds: model.number().nullable(),
  payload: model.json(),
  result: model.json().nullable(),
  error: model.text().nullable(),
  product_id: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default AiGenerationJob
