import { clearS2bdiyTokenCache, getS2bdiyAccessToken } from "../lib/s2bdiy/s2bdiy-auth"

describe("getS2bdiyAccessToken", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    clearS2bdiyTokenCache()
  })

  it("caches token between calls", async () => {
    let calls = 0
    global.fetch = jest.fn().mockImplementation(async () => {
      calls++
      return {
        ok: true,
        json: async () => ({ data: { token: "test-token-abc" } }),
      }
    }) as typeof fetch

    const config = {
      apiBaseUrl: "https://opentest.s2bdiy.com",
      appKey: "wm001",
      appSecret: "secret",
      platformId: 99,
    }

    const t1 = await getS2bdiyAccessToken(config)
    const t2 = await getS2bdiyAccessToken(config)
    expect(t1).toBe("test-token-abc")
    expect(t2).toBe("test-token-abc")
    expect(calls).toBe(1)
  })
})
