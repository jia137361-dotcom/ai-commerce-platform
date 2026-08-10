import {
  buyerLoginEmailDeniedMessage,
  getBuyerAuthTestEmails,
  isAllowedBuyerLoginEmail,
  isBuyerAuthTestEmail,
  isValidBuyerEmail,
  normalizeBuyerEmail,
  resolveBuyerSessionTtl,
} from "../lib/buyer-auth-policy"

describe("buyer-auth-policy allowlist", () => {
  const originalTestEmails = process.env.BUYER_AUTH_TEST_EMAILS

  afterEach(() => {
    if (originalTestEmails === undefined) delete process.env.BUYER_AUTH_TEST_EMAILS
    else process.env.BUYER_AUTH_TEST_EMAILS = originalTestEmails
  })

  it("allows gmail and apple ecosystem domains", () => {
    expect(isAllowedBuyerLoginEmail("user@gmail.com")).toBe(true)
    expect(isAllowedBuyerLoginEmail("user@googlemail.com")).toBe(true)
    expect(isAllowedBuyerLoginEmail("user@icloud.com")).toBe(true)
    expect(isAllowedBuyerLoginEmail("user@me.com")).toBe(true)
    expect(isAllowedBuyerLoginEmail("user@mac.com")).toBe(true)
    expect(isAllowedBuyerLoginEmail("hide@privaterelay.appleid.com")).toBe(true)
  })

  it("allows the default QQ test account and rejects other qq.com emails", () => {
    delete process.env.BUYER_AUTH_TEST_EMAILS
    expect(isAllowedBuyerLoginEmail("1355026750@qq.com")).toBe(true)
    expect(isBuyerAuthTestEmail("1355026750@qq.com")).toBe(true)
    expect(isAllowedBuyerLoginEmail("other@qq.com")).toBe(false)
    expect(getBuyerAuthTestEmails()).toContain("1355026750@qq.com")
  })

  it("rejects invalid or non-allowlisted emails", () => {
    expect(isValidBuyerEmail("bad")).toBe(false)
    expect(isAllowedBuyerLoginEmail("bad")).toBe(false)
    expect(isAllowedBuyerLoginEmail("user@outlook.com")).toBe(false)
    expect(normalizeBuyerEmail("  User@Gmail.COM ")).toBe("user@gmail.com")
    expect(buyerLoginEmailDeniedMessage).toMatch(/Gmail or Apple/i)
  })

  it("resolves remember-me session TTL", () => {
    expect(resolveBuyerSessionTtl(false)).toBeTruthy()
    expect(resolveBuyerSessionTtl(true)).toBeTruthy()
  })
})
