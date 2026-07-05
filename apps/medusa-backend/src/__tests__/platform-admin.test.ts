import { bucketCreatedAtByDay, lastNDays } from "../lib/platform-admin/platform-utils"
import { isPlatformDisabled, readPlatformStatus } from "../lib/platform-admin/require-platform-operator"

describe("platform utils", () => {
  it("buckets rows by day", () => {
    const days = ["2026-07-01", "2026-07-02"]
    const rows = [{ created_at: "2026-07-01T10:00:00.000Z" }, { created_at: "2026-07-01T12:00:00.000Z" }]
    expect(bucketCreatedAtByDay(rows, days)).toEqual([
      { date: "2026-07-01", count: 2 },
      { date: "2026-07-02", count: 0 },
    ])
  })

  it("returns 7 days", () => {
    expect(lastNDays(7)).toHaveLength(7)
  })
})

describe("platform status metadata", () => {
  it("detects disabled accounts", () => {
    expect(isPlatformDisabled({ platform_status: "disabled" })).toBe(true)
    expect(readPlatformStatus({ platform_status: "active" })).toBe("active")
  })
})
