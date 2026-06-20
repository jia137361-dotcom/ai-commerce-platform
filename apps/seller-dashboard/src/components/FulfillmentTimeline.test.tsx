import { describe, expect, it } from "vitest"
import type { FulfillmentTimelineStep } from "@ai-commerce/shared-types"

export const countTimelineSteps = (steps: FulfillmentTimelineStep[]) => steps.length

describe("FulfillmentTimeline", () => {
  it("expects five canonical steps in API payloads", () => {
    const steps: FulfillmentTimelineStep[] = [
      { key: "waiting", label: "Waiting", status: "completed", timestamp: "2026-05-24T08:00:00.000Z" },
      { key: "pushed", label: "Pushed", status: "active", timestamp: null },
      { key: "in_production", label: "In Production", status: "pending", timestamp: null },
      { key: "shipped", label: "Shipped", status: "pending", timestamp: null },
      { key: "delivered", label: "Delivered", status: "pending", timestamp: null },
    ]
    expect(countTimelineSteps(steps)).toBe(5)
    expect(steps.map((s) => s.label)).toContain("Waiting")
    expect(steps.map((s) => s.label)).toContain("Pushed")
  })
})
