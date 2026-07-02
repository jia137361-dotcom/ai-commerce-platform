import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, apiFetch, setToken } from "./api-client"

describe("apiFetch", () => {
  afterEach(() => {
    setToken(null)
    vi.restoreAllMocks()
  })

  it("throws ApiError with code from backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: "VALIDATION_ERROR", message: "title is required" } }),
      })
    )

    await expect(apiFetch("/admin/products")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "title is required",
    } satisfies Partial<ApiError>)
  })

  it("clears token on 401", async () => {
    setToken("expired-token")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      })
    )

    await expect(apiFetch("/admin/products")).rejects.toMatchObject({ status: 401 })
    expect(localStorage.getItem("seller_admin_token")).toBeNull()
  })
})
