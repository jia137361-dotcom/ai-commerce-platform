import { Modules } from "@medusajs/framework/utils"
import {
  confirmBuyerPasswordReset,
  requestBuyerPasswordReset,
} from "../lib/buyer-password-reset"
import {
  confirmCustomerEmailVerification,
  formatVerificationCode,
  isEmailVerified,
  readEmailVerificationStatus,
  sendCustomerEmailVerification,
} from "../lib/email-verification"
import { POST as emailVerificationPost } from "../api/store/customers/me/email-verification/route"
import { validateCustomerAddressInput } from "../lib/customer-addresses"
import { sendBuyerEmailVerificationCode, sendBuyerPasswordResetCode } from "../lib/email"

jest.mock("../lib/email", () => ({
  sendBuyerEmailVerificationCode: jest.fn(async () => ({ success: true, id: "email_1" })),
  sendBuyerPasswordResetCode: jest.fn(async () => ({ success: true, id: "email_2" })),
}))

const mockedSendVerificationCode = sendBuyerEmailVerificationCode as jest.MockedFunction<typeof sendBuyerEmailVerificationCode>
const mockedSendPasswordResetCode = sendBuyerPasswordResetCode as jest.MockedFunction<typeof sendBuyerPasswordResetCode>

const ORIGINAL_ENV = process.env

describe("email-verification", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "test", AUTH_DEV_CODE_ENABLED: "true" }
    jest.spyOn(console, "info").mockImplementation(() => undefined)
    mockedSendVerificationCode.mockResolvedValue({ success: true, id: "email_1" })
    mockedSendPasswordResetCode.mockResolvedValue({ success: true, id: "email_2" })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it("detects verified metadata", () => {
    expect(isEmailVerified({ email_verified_at: "2026-06-22T00:00:00.000Z" })).toBe(true)
    expect(isEmailVerified({})).toBe(false)
    expect(readEmailVerificationStatus({ email_verified_at: "2026-06-22T00:00:00.000Z" }).verified).toBe(true)
  })

  it("stores and confirms a verification code", async () => {
    let metadata: Record<string, unknown> = { existing_profile_flag: true }
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({
        id: "cus_1",
        email: "buyer@example.com",
        metadata,
      })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = data.metadata
      }),
    }
    const container = {
      resolve: () => customerModule,
    }

    const sent = await sendCustomerEmailVerification(container as never, "cus_1")
    expect(sent.email).toBe("buyer@example.com")
    expect(metadata.email_verification_code_hash).toBeTruthy()
    expect(metadata.existing_profile_flag).toBe(true)
    expect(mockedSendVerificationCode).toHaveBeenCalledWith(expect.objectContaining({
      to: "buyer@example.com",
      code: expect.stringMatching(/^\d{6}$/),
      idempotencyKey: expect.any(String),
    }))

    const code = sent.devCode as string
    expect(mockedSendVerificationCode.mock.calls[0][0].code).toBe(code)
    const confirmed = await confirmCustomerEmailVerification(container as never, "cus_1", code)
    expect(confirmed.verified).toBe(true)
    expect(metadata.email_verified_at).toBeTruthy()
    expect(metadata.email_verification_code_hash).toBeNull()
  })

  it("rejects invalid verification codes", async () => {
    let metadata: Record<string, unknown> = {}
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({
        id: "cus_1",
        email: "buyer@example.com",
        metadata,
      })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = data.metadata
      }),
    }
    const container = { resolve: () => customerModule }
    await sendCustomerEmailVerification(container as never, "cus_1")

    await expect(
      confirmCustomerEmailVerification(container as never, "cus_1", "000000")
    ).rejects.toThrow("Verification code is incorrect")
  })

  it("rejects expired verification codes", async () => {
    let metadata: Record<string, unknown> = {}
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({ id: "cus_1", email: "buyer@example.com", metadata })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = {
          ...data.metadata,
          email_verification_expires_at: new Date(Date.now() - 1000).toISOString(),
        }
      }),
    }
    const container = { resolve: () => customerModule }
    const sent = await sendCustomerEmailVerification(container as never, "cus_1")
    await expect(confirmCustomerEmailVerification(container as never, "cus_1", sent.devCode as string)).rejects.toThrow("expired")
  })

  it("applies resend cooldown", async () => {
    let metadata: Record<string, unknown> = {}
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({ id: "cus_1", email: "buyer@example.com", metadata })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = data.metadata
      }),
    }
    const container = { resolve: () => customerModule }
    await sendCustomerEmailVerification(container as never, "cus_1")
    await expect(sendCustomerEmailVerification(container as never, "cus_1")).rejects.toThrow("Please wait")
  })

  it("formats verification codes as 6-digit strings with leading zeroes", () => {
    expect(formatVerificationCode(123)).toBe("000123")
    expect(formatVerificationCode(999999)).toBe("999999")
  })

  it("invalidates old codes after resend and accepts only the latest code", async () => {
    let metadata: Record<string, unknown> = {}
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({ id: "cus_1", email: "buyer@example.com", metadata })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = data.metadata
      }),
    }
    const container = { resolve: () => customerModule }

    const first = await sendCustomerEmailVerification(container as never, "cus_1")
    const firstCode = first.devCode as string
    metadata.email_verification_last_sent_at = new Date(Date.now() - 120_000).toISOString()
    const second = await sendCustomerEmailVerification(container as never, "cus_1")
    const secondCode = second.devCode as string

    await expect(confirmCustomerEmailVerification(container as never, "cus_1", firstCode)).rejects.toThrow("incorrect")
    await expect(confirmCustomerEmailVerification(container as never, "cus_1", secondCode)).resolves.toEqual(expect.objectContaining({
      verified: true,
      email: "buyer@example.com",
    }))
  })

  it("keeps send and confirm on the same authenticated customer in the route contract", async () => {
    let metadata: Record<string, unknown> = {}
    const customerModule = {
      retrieveCustomer: jest.fn(async (id: string) => ({ id, email: "buyer@example.com", metadata })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = data.metadata
      }),
    }
    const container = { resolve: () => customerModule }
    const makeRes = () => {
      const res = {
        statusCode: 200,
        status: jest.fn((code: number) => {
          res.statusCode = code
          return res
        }),
        json: jest.fn((payload: unknown) => payload),
      }
      return res
    }

    const sendRes = makeRes()
    const sendPayload = await emailVerificationPost({
      auth_context: { actor_id: "cus_1" },
      scope: container,
      body: { action: "send" },
    } as never, sendRes as never) as { dev_code?: string }
    const confirmRes = makeRes()
    await emailVerificationPost({
      auth_context: { actor_id: "cus_1" },
      scope: container,
      body: { action: "confirm", code: sendPayload.dev_code },
    } as never, confirmRes as never)

    expect(sendRes.statusCode).toBe(200)
    expect(confirmRes.statusCode).toBe(200)
    expect(customerModule.retrieveCustomer).toHaveBeenCalledWith("cus_1")
    expect(customerModule.updateCustomers).toHaveBeenCalledWith("cus_1", expect.any(Object))
    expect(metadata.email_verified_at).toBeTruthy()
  })

  it("does not log verification code or hash during diagnostics", async () => {
    let metadata: Record<string, unknown> = {}
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({ id: "cus_1", email: "buyer@example.com", metadata })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = data.metadata
      }),
    }
    const container = { resolve: () => customerModule }
    const sent = await sendCustomerEmailVerification(container as never, "cus_1")
    const logs = (console.info as jest.Mock).mock.calls.flat().map(String).join(" ")
    expect(logs).not.toContain(sent.devCode as string)
    expect(logs).not.toContain(String(metadata.email_verification_code_hash))
  })

  it("does not return a dev code unless explicitly enabled outside production", async () => {
    process.env.AUTH_DEV_CODE_ENABLED = "false"
    let metadata: Record<string, unknown> = {}
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({ id: "cus_1", email: "buyer@example.com", metadata })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = data.metadata
      }),
    }
    const container = { resolve: () => customerModule }
    await expect(sendCustomerEmailVerification(container as never, "cus_1")).resolves.not.toHaveProperty("devCode")

    process.env.AUTH_DEV_CODE_ENABLED = "true"
    process.env.NODE_ENV = "production"
    metadata = {}
    await expect(sendCustomerEmailVerification(container as never, "cus_1")).resolves.not.toHaveProperty("devCode")
  })

  it("rolls back verification metadata when email delivery fails so resend can retry", async () => {
    let metadata: Record<string, unknown> = {}
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({ id: "cus_1", email: "buyer@example.com", metadata })),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        metadata = data.metadata
      }),
    }
    const container = { resolve: () => customerModule }
    mockedSendVerificationCode.mockResolvedValueOnce({ success: false, error: "provider rejected" })

    await expect(sendCustomerEmailVerification(container as never, "cus_1")).rejects.toThrow("couldn't send")
    expect(metadata.email_verification_code_hash).toBeUndefined()

    mockedSendVerificationCode.mockResolvedValueOnce({ success: true, id: "email_retry" })
    await expect(sendCustomerEmailVerification(container as never, "cus_1")).resolves.toEqual(expect.objectContaining({
      email: "buyer@example.com",
    }))
  })
})

describe("buyer password reset", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "test", AUTH_DEV_CODE_ENABLED: "true" }
    mockedSendVerificationCode.mockResolvedValue({ success: true, id: "email_1" })
    mockedSendPasswordResetCode.mockResolvedValue({ success: true, id: "email_2" })
  })

  const makeContainer = (customer?: { id: string; email: string; metadata?: Record<string, unknown> }) => {
    let current = customer ? { ...customer, metadata: { ...(customer.metadata ?? {}) } } : null
    const customerModule = {
      listCustomers: jest.fn(async (filter: Record<string, unknown>) =>
        current && filter.email === current.email ? [current] : []
      ),
      retrieveCustomer: jest.fn(async () => current),
      updateCustomers: jest.fn(async (_id: string, data: { metadata: Record<string, unknown> }) => {
        if (current) current = { ...current, metadata: data.metadata }
        return current
      }),
    }
    const authModule = {
      updateProvider: jest.fn(async () => ({ success: true })),
    }
    const container = {
      resolve: jest.fn((key) => {
        if (key === Modules.CUSTOMER) return customerModule
        if (key === Modules.AUTH) return authModule
        throw new Error(`Unknown module ${String(key)}`)
      }),
    }
    return { container, customerModule, authModule, getCustomer: () => current }
  }

  it("returns a neutral response for unknown email", async () => {
    const { container, customerModule } = makeContainer()
    const result = await requestBuyerPasswordReset(container as never, "missing@example.com")
    expect(result.sent).toBe(true)
    expect(result.message).toMatch(/If an account exists/)
    expect(customerModule.updateCustomers).not.toHaveBeenCalled()
  })

  it("resets password with a valid code and invalidates the token", async () => {
    const { container, authModule, getCustomer } = makeContainer({ id: "cus_1", email: "buyer@example.com" })
    const requested = await requestBuyerPasswordReset(container as never, "buyer@example.com")
    expect(mockedSendPasswordResetCode).toHaveBeenCalledWith(expect.objectContaining({
      to: "buyer@example.com",
      code: expect.stringMatching(/^\d{6}$/),
      idempotencyKey: expect.any(String),
    }))
    const result = await confirmBuyerPasswordReset(container as never, {
      email: "buyer@example.com",
      code: requested.devCode,
      password: "new-password",
    })
    expect(result.reset).toBe(true)
    expect(authModule.updateProvider).toHaveBeenCalledWith("emailpass", {
      entity_id: "buyer@example.com",
      password: "new-password",
    })
    expect(getCustomer()?.metadata?.password_reset_code_hash).toBeNull()
    expect(getCustomer()?.metadata?.password_reset_used_at).toBeTruthy()
  })

  it("rejects invalid reset code", async () => {
    const { container } = makeContainer({ id: "cus_1", email: "buyer@example.com" })
    await requestBuyerPasswordReset(container as never, "buyer@example.com")
    await expect(confirmBuyerPasswordReset(container as never, {
      email: "buyer@example.com",
      code: "000000",
      password: "new-password",
    })).rejects.toThrow("invalid or expired")
  })

  it("rejects expired reset code", async () => {
    const { container, getCustomer } = makeContainer({ id: "cus_1", email: "buyer@example.com" })
    const requested = await requestBuyerPasswordReset(container as never, "buyer@example.com")
    const metadata = getCustomer()?.metadata ?? {}
    metadata.password_reset_expires_at = new Date(Date.now() - 1000).toISOString()
    await expect(confirmBuyerPasswordReset(container as never, {
      email: "buyer@example.com",
      code: requested.devCode,
      password: "new-password",
    })).rejects.toThrow("invalid or expired")
  })

  it("rejects a used reset code", async () => {
    const { container, getCustomer } = makeContainer({ id: "cus_1", email: "buyer@example.com" })
    const requested = await requestBuyerPasswordReset(container as never, "buyer@example.com")
    const metadata = getCustomer()?.metadata ?? {}
    metadata.password_reset_used_at = new Date().toISOString()
    await expect(confirmBuyerPasswordReset(container as never, {
      email: "buyer@example.com",
      code: requested.devCode,
      password: "new-password",
    })).rejects.toThrow("already been used")
  })

  it("rolls back reset metadata when email delivery fails so the buyer can retry", async () => {
    const { container, getCustomer } = makeContainer({ id: "cus_1", email: "buyer@example.com" })
    mockedSendPasswordResetCode.mockResolvedValueOnce({ success: false, error: "provider rejected" })
    await expect(requestBuyerPasswordReset(container as never, "buyer@example.com")).rejects.toThrow("couldn't send")
    expect(getCustomer()?.metadata?.password_reset_code_hash).toBeUndefined()

    mockedSendPasswordResetCode.mockResolvedValueOnce({ success: true, id: "email_retry" })
    await expect(requestBuyerPasswordReset(container as never, "buyer@example.com")).resolves.toEqual(expect.objectContaining({
      sent: true,
    }))
  })
})

describe("customer-addresses validation", () => {
  it("requires core address fields", () => {
    expect(validateCustomerAddressInput({})).toMatch(/required/)
    expect(
      validateCustomerAddressInput({
        address_1: "1 Main",
        city: "Shanghai",
        postal_code: "200000",
        country_code: "cn",
      })
    ).toEqual(
      expect.objectContaining({
        address_1: "1 Main",
        country_code: "cn",
      })
    )
  })
})
