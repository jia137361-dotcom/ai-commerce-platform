import { describe, expect, it } from "vitest"
import { resolveStatusBadgeLabel } from "./StatusBadge"

describe("StatusBadge", () => {
  it("shows Failed for ai generation errors", () => {
    expect(
      resolveStatusBadgeLabel("draft", "ai", { generation_failed: true })
    ).toBe("Failed")
  })

  it("shows published status", () => {
    expect(resolveStatusBadgeLabel("published")).toBe("published")
  })
})
