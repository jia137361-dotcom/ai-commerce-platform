import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../../lib/store-context"
import {
  formatSsePayload,
  subscribeAiJobEvents,
  type AiJobStreamEvent,
} from "../../../../../../lib/ai-generation/job-events"
import { normalizeAiJobResponse } from "../../../../../../lib/ai-generation/run-job"
import { getStoreCoreService, sendError } from "../../../../../_helpers/store-core"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const jobId = req.params.job_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const jobs = await storeCoreService.listAiGenerationJobs({ id: jobId })
  const job = jobs[0]

  if (!job) {
    return sendError(res, 404, "AI_JOB_NOT_FOUND", "AI job not found")
  }

  if (job.store_id !== storeId) {
    return sendError(
      res,
      403,
      "AI_JOB_STORE_MISMATCH",
      "This AI generation job belongs to another store. Please start a new generation for the current store."
    )
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  res.flushHeaders?.()

  const send = (event: AiJobStreamEvent) => {
    res.write(formatSsePayload(event))
  }

  if (job.status === "complete" && job.product_id) {
    send({
      type: "complete",
      product_id: job.product_id,
      generation: ((job.result as Record<string, unknown> | null)?.generation ??
        {}) as Record<string, unknown>,
    })
    res.end()
    return
  }

  if (job.status === "failed") {
    send({ type: "error", message: job.error ?? "AI generation failed" })
    res.end()
    return
  }

  send({
    type: "progress",
    progress: job.progress ?? 0,
    current_step: job.current_step ?? "queued",
  })

  const unsubscribe = subscribeAiJobEvents(jobId, send)

  const pollUntilDone = async () => {
    while (!res.writableEnded) {
      await sleep(2000)
      const rows = await storeCoreService.listAiGenerationJobs({ id: jobId })
      const current = rows[0]
      if (!current) {
        break
      }
      if (current.status === "complete" && current.product_id) {
        send({
          type: "complete",
          product_id: current.product_id,
          generation: ((current.result as Record<string, unknown> | null)?.generation ??
            {}) as Record<string, unknown>,
        })
        break
      }
      if (current.status === "failed") {
        send({ type: "error", message: current.error ?? "AI generation failed" })
        break
      }
      send({
        type: "progress",
        progress: current.progress ?? 0,
        current_step: current.current_step ?? "running",
      })
    }
    unsubscribe()
    if (!res.writableEnded) {
      res.end()
    }
  }

  req.on("close", () => {
    unsubscribe()
  })

  void pollUntilDone()
}
