import { BuyerGoogleAuthError, completeBuyerGoogleAuth } from "../lib/buyer-google-auth"
import { generateJwtToken } from "@medusajs/framework/utils"

jest.mock("@medusajs/medusa/api/auth/utils/generate-jwt-token", () => ({
  generateJwtTokenForAuthIdentity: jest.fn(async () => "session-token"),
}))

describe("buyer google auth complete", () => {
  const previousEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...previousEnv }
    jest.clearAllMocks()
  })

  it("rejects when google oauth is not configured", async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    await expect(
      completeBuyerGoogleAuth({} as never, { authorizationHeader: "Bearer x" })
    ).rejects.toMatchObject({
      code: "GOOGLE_AUTH_DISABLED",
      status: 503,
    })
  })

  it("rejects missing bearer token", async () => {
    process.env.GOOGLE_CLIENT_ID = "client"
    process.env.GOOGLE_CLIENT_SECRET = "secret"
    await expect(completeBuyerGoogleAuth({} as never, {})).rejects.toBeInstanceOf(BuyerGoogleAuthError)
    await expect(completeBuyerGoogleAuth({} as never, {})).rejects.toMatchObject({
      code: "AUTH_TOKEN_REQUIRED",
    })
  })

  it("merges onto an existing customer by google email", async () => {
    process.env.GOOGLE_CLIENT_ID = "client"
    process.env.GOOGLE_CLIENT_SECRET = "secret"
    process.env.BUYER_SESSION_TTL_SHORT = "7d"
    process.env.BUYER_SESSION_TTL_REMEMBER = "30d"

    const token = generateJwtToken(
      {
        actor_id: "",
        actor_type: "customer",
        auth_identity_id: "auth_google_1",
        auth_provider: "google",
        app_metadata: {},
        user_metadata: { email: "buyer@gmail.com", given_name: "Buyer" },
      },
      { secret: "test-secret", expiresIn: "1h" }
    )

    const updateAuthIdentities = jest.fn(async (data) => data)
    const listAuthIdentities = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: "auth_google_1",
          app_metadata: {},
          provider_identities: [
            {
              provider: "google",
              entity_id: "google-sub",
              user_metadata: { email: "buyer@gmail.com", given_name: "Buyer" },
            },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "auth_google_1",
          app_metadata: { customer_id: "cus_existing" },
          provider_identities: [
            {
              provider: "google",
              entity_id: "google-sub",
              user_metadata: { email: "buyer@gmail.com" },
            },
          ],
        },
      ])

    const listCustomers = jest.fn(async () => [{ id: "cus_existing", email: "buyer@gmail.com", metadata: {} }])
    const updateCustomers = jest.fn(async (_id, data) => ({ id: "cus_existing", email: "buyer@gmail.com", ...data }))
    const retrieveCustomer = jest.fn(async () => ({
      id: "cus_existing",
      email: "buyer@gmail.com",
      metadata: { email_verified_at: "2026-01-01T00:00:00.000Z" },
    }))
    const createCustomers = jest.fn()

    const container = {
      resolve: (key: string) => {
        if (key === "configModule" || String(key).includes("config")) {
          return {
            projectConfig: {
              http: { jwtSecret: "test-secret", jwtExpiresIn: "1d" },
            },
          }
        }
        if (String(key).includes("auth") || key === "auth") {
          return { listAuthIdentities, updateAuthIdentities }
        }
        if (String(key).includes("customer") || key === "customer") {
          return { listCustomers, createCustomers, updateCustomers, retrieveCustomer }
        }
        throw new Error(`unexpected resolve: ${String(key)}`)
      },
    }

    // Modules.AUTH / CUSTOMER / CONFIG use symbol-like string constants — patch via Modules values.
    const { Modules, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
    const scoped = {
      resolve: (key: unknown) => {
        if (key === ContainerRegistrationKeys.CONFIG_MODULE) {
          return {
            projectConfig: {
              http: { jwtSecret: "test-secret", jwtExpiresIn: "1d" },
            },
          }
        }
        if (key === Modules.AUTH) {
          return { listAuthIdentities, updateAuthIdentities }
        }
        if (key === Modules.CUSTOMER) {
          return { listCustomers, createCustomers, updateCustomers, retrieveCustomer }
        }
        return container.resolve(String(key))
      },
    }

    const result = await completeBuyerGoogleAuth(scoped as never, {
      authorizationHeader: `Bearer ${token}`,
      rememberMe: true,
    })

    expect(result.customerId).toBe("cus_existing")
    expect(result.created).toBe(false)
    expect(result.token).toBe("session-token")
    expect(createCustomers).not.toHaveBeenCalled()
    expect(updateAuthIdentities).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "auth_google_1",
        app_metadata: expect.objectContaining({ customer_id: "cus_existing" }),
      })
    )
  })

  it("rejects non-allowlisted google emails", async () => {
    process.env.GOOGLE_CLIENT_ID = "client"
    process.env.GOOGLE_CLIENT_SECRET = "secret"

    const token = generateJwtToken(
      {
        actor_id: "",
        actor_type: "customer",
        auth_identity_id: "auth_google_2",
        auth_provider: "google",
        app_metadata: {},
        user_metadata: { email: "person@outlook.com" },
      },
      { secret: "test-secret", expiresIn: "1h" }
    )

    const { Modules, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
    const listAuthIdentities = jest.fn(async () => [
      {
        id: "auth_google_2",
        app_metadata: {},
        provider_identities: [
          { provider: "google", user_metadata: { email: "person@outlook.com" } },
        ],
      },
    ])

    const scoped = {
      resolve: (key: unknown) => {
        if (key === ContainerRegistrationKeys.CONFIG_MODULE) {
          return { projectConfig: { http: { jwtSecret: "test-secret" } } }
        }
        if (key === Modules.AUTH) {
          return { listAuthIdentities, updateAuthIdentities: jest.fn() }
        }
        if (key === Modules.CUSTOMER) {
          return {
            listCustomers: jest.fn(async () => []),
            createCustomers: jest.fn(),
            updateCustomers: jest.fn(),
            retrieveCustomer: jest.fn(),
          }
        }
        throw new Error(`unexpected resolve: ${String(key)}`)
      },
    }

    await expect(
      completeBuyerGoogleAuth(scoped as never, { authorizationHeader: `Bearer ${token}` })
    ).rejects.toMatchObject({
      code: "EMAIL_PROVIDER_NOT_ALLOWED",
      status: 403,
    })
  })
})
