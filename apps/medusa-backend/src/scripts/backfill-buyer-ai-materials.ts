/**
 * Backfill S2BDIY material_id for completed buyer_diy AI jobs that have artwork
 * but never uploaded (e.g. generated while S2BDIY_MOCK_MODE / credentials broken).
 *
 * Usage (from apps/medusa-backend):
 *   npx medusa exec ./src/scripts/backfill-buyer-ai-materials.ts
 *   BACKFILL_LIMIT=20 npx medusa exec ./src/scripts/backfill-buyer-ai-materials.ts
 */
import type { ExecArgs } from "./medusa-exec-args"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { uploadBuyerArtworkToS2bdiy } from "../lib/ai-generation/buyer-generate"
import { updateAiJobRecord } from "../lib/ai-generation/run-job"
import { getS2bdiyConfig, isS2bdiyMockMode } from "../modules/suppliers/s2bdiy/config"

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

export default async function backfillBuyerAiMaterials({ container }: ExecArgs) {
  if (isS2bdiyMockMode()) {
    throw new Error("S2BDIY_MOCK_MODE=true — refuse to backfill. Set S2BDIY_MOCK_MODE=false first.")
  }
  if (!getS2bdiyConfig()) {
    throw new Error("S2BDIY not configured — set S2BDIY_APP_KEY / S2BDIY_APP_SECRET")
  }

  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const limit = Math.min(Math.max(Number(process.env.BACKFILL_LIMIT) || 50, 1), 200)

  const jobs = (await storeCore.listAiGenerationJobs(
    { status: "complete" },
    { order: { created_at: "DESC" }, take: limit * 3 }
  )) as Array<Record<string, unknown>>

  let scanned = 0
  let skipped = 0
  let uploaded = 0
  let failed = 0

  for (const job of jobs) {
    const payload = asRecord(job.payload)
    if (payload.buyer_diy !== true) continue
    scanned += 1

    const result = { ...asRecord(job.result) }
    const existingId =
      typeof result.material_id === "string" && result.material_id.trim()
        ? result.material_id.trim()
        : null
    if (existingId) {
      skipped += 1
      continue
    }

    const imageUrl =
      (typeof result.print_file_url === "string" && result.print_file_url) ||
      (typeof result.design_image_url === "string" && result.design_image_url) ||
      null
    if (!imageUrl) {
      skipped += 1
      console.log(`[skip] ${job.id} — no artwork url`)
      continue
    }

    const title =
      (typeof result.title === "string" && result.title) ||
      (typeof result.prompt === "string" && `AI artwork — ${result.prompt.slice(0, 40)}`) ||
      `buyer-ai-${String(job.id).slice(-8)}`

    console.log(`[upload] ${job.id} ← ${imageUrl}`)
    const upload = await uploadBuyerArtworkToS2bdiy(imageUrl, title)
    if (upload.ok === false) {
      failed += 1
      result.material_upload_error = upload.error
      await updateAiJobRecord(storeCore, String(job.id), { result })
      console.error(`  FAIL: ${upload.error}`)
      continue
    }

    result.material_id = upload.material_id
    result.material_url = upload.material_url ?? result.material_url ?? imageUrl
    result.material_upload_error = null
    result.material_backfilled_at = new Date().toISOString()

    const productId =
      (typeof result.base_product_id === "string" && result.base_product_id) ||
      (typeof job.product_id === "string" && job.product_id) ||
      null
    if (productId) {
      result.editor_path = `/design/${encodeURIComponent(productId)}?materialId=${encodeURIComponent(upload.material_id)}`
    }

    await updateAiJobRecord(storeCore, String(job.id), { result })
    uploaded += 1
    console.log(`  OK material_id=${upload.material_id}`)
  }

  console.log(
    JSON.stringify(
      { scanned, skipped, uploaded, failed, limit },
      null,
      2
    )
  )
}
