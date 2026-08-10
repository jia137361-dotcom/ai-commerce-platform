import { BuyerLoginOtpError } from "../lib/buyer-login-otp"
import {
  buyerLoginEmailDeniedMessage,
  isAllowedBuyerLoginEmail,
  resolveBuyerSessionTtl,
} from "../lib/buyer-auth-policy"

describe("buyer login otp helpers", () => {
  it("exposes a typed error for API mapping", () => {
    const error = new BuyerLoginOtpError("EMAIL_PROVIDER_NOT_ALLOWED", buyerLoginEmailDeniedMessage, 403)
    expect(error.code).toBe("EMAIL_PROVIDER_NOT_ALLOWED")
    expect(error.status).toBe(403)
    expect(error.message).toMatch(/Gmail or Apple/i)
  })

  it("uses longer TTL when remember-me is enabled", () => {
    const shortTtl = resolveBuyerSessionTtl(false)
    const longTtl = resolveBuyerSessionTtl(true)
    expect(shortTtl).toBeTruthy()
    expect(longTtl).toBeTruthy()
    expect(isAllowedBuyerLoginEmail("ok@gmail.com")).toBe(true)
  })
})
