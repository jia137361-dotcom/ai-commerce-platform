import { formatSsePayload } from "../lib/ai-generation/job-events"
import { normalizeAiJobResponse } from "../lib/ai-generation/run-job"

describe("formatSsePayload", () => {
  it("serializes progress events", () => {
    const payload = formatSsePayload({
      type: "progress",
      progress: 45,
      current_step: "generating_mockup",
    })
    expect(payload).toContain('"progress":45')
    expect(payload.endsWith("\n\n")).toBe(true)
  })
})

describe("normalizeAiJobResponse", () => {
  it("maps job record fields", () => {
    const normalized = normalizeAiJobResponse({
      id: "aij_123",
      store_id: "default_store",
      status: "running",
      progress: 70,
      current_step: "creating_draft",
      estimated_seconds: 45,
      product_id: null,
      error: null,
      result: null,
      created_at: "2026-06-15T00:00:00.000Z",
      updated_at: "2026-06-15T00:00:01.000Z",
    })
    expect(normalized).toMatchObject({
      job_id: "aij_123",
      status: "running",
      progress: 70,
      current_step: "creating_draft",
    })
  })
})
