import {
  clearS2bdiyTokenCache,
  getS2bdiyAccessToken,
} from "../modules/suppliers/s2bdiy/s2bdiy-auth"

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

  it("requests accessToken with official POST JSON app_key/app_secret payload", async () => {
    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ data: { token: "official-token" } }),
    })) as typeof fetch

    await getS2bdiyAccessToken({
      apiBaseUrl: "https://opentest.s2bdiy.com/",
      appKey: "wm001",
      appSecret: "secret",
      platformId: 99,
    }, true)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe("https://opentest.s2bdiy.com/open/v1/accessToken")
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
    expect(JSON.parse(options.body)).toEqual({
      app_key: "wm001",
      app_secret: "secret",
    })
    expect(options.body).not.toContain("appKey")
    expect(options.body).not.toContain("appSecret")
  })
})
