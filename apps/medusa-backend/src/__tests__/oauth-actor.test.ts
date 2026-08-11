import {
  buildAuthIdentityActorMetadata,
  isGoogleOAuthConfigured,
  resolveOAuthCallbackUrl,
} from "../lib/oauth-actor"

describe("oauth actor helpers", () => {
  const previousEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...previousEnv }
  })

  it("resolves buyer callback from GOOGLE_CALLBACK_URL", () => {
    process.env.GOOGLE_CALLBACK_URL = "http://127.0.0.1:5174/auth/google/callback"
    delete process.env.GOOGLE_BUYER_CALLBACK_URL
    expect(resolveOAuthCallbackUrl("buyer")).toBe("http://127.0.0.1:5174/auth/google/callback")
  })

  it("prefers buyer-specific callback override", () => {
    process.env.GOOGLE_CALLBACK_URL = "http://127.0.0.1:5174/auth/google/callback"
    process.env.GOOGLE_BUYER_CALLBACK_URL = "http://localhost:5174/auth/google/callback"
    expect(resolveOAuthCallbackUrl("buyer")).toBe("http://localhost:5174/auth/google/callback")
  })

  it("resolves seller callback for future extension", () => {
    process.env.SELLER_DASHBOARD_URL = "http://127.0.0.1:5173"
    delete process.env.GOOGLE_SELLER_CALLBACK_URL
    expect(resolveOAuthCallbackUrl("seller")).toBe("http://127.0.0.1:5173/auth/google/callback")
  })

  it("detects google oauth configuration from client credentials", () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(isGoogleOAuthConfigured()).toBe(false)
    process.env.GOOGLE_CLIENT_ID = "client"
    process.env.GOOGLE_CLIENT_SECRET = "secret"
    expect(isGoogleOAuthConfigured()).toBe(true)
  })

  it("links buyer and seller actor ids in auth metadata", () => {
    expect(
      buildAuthIdentityActorMetadata({
        authIdentityId: "auth_1",
        actor: "buyer",
        actorId: "cus_1",
        previousMetadata: { existing: true },
      })
    ).toEqual({ existing: true, customer_id: "cus_1" })

    expect(
      buildAuthIdentityActorMetadata({
        authIdentityId: "auth_2",
        actor: "seller",
        actorId: "user_1",
      })
    ).toEqual({ user_id: "user_1" })
  })
})
