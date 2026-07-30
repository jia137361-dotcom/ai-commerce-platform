import { Modules } from "@medusajs/framework/utils"
import {
  confirmBuyerPasswordReset,
  requestBuyerPasswordReset,
} from "../lib/buyer-password-reset"
import {
  confirmCustomerEmailVerification,
  isEmailVerified,
  readEmailVerificationStatus,
  sendCustomerEmailVerification,
} from "../lib/email-verification"
import { validateCustomerAddressInput } from "../lib/customer-addresses"

jest.mock("../lib/email", () => ({
  sendBuyerEmailVerificationCode: jest.fn(async () => ({ success: true, id: "email_1" })),
  sendBuyerPasswordResetCode: jest.fn(async () => ({ success: true, id: "email_2" })),
}))

describe("email-verification", () => {
  it("detects verified metadata", () => {
    expect(isEmailVerified({ email_verified_at: "2026-06-22T00:00:00.000Z" })).toBe(true)
    expect(isEmailVerified({})).toBe(false)
    expect(readEmailVerificationStatus({ email_verified_at: "2026-06-22T00:00:00.000Z" }).verified).toBe(true)
  })

  it("stores and confirms a verification code", async () => {
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
    const container = {
      resolve: () => customerModule,
    }

    const sent = await sendCustomerEmailVerification(container as never, "cus_1")
    expect(sent.email).toBe("buyer@example.com")
    expect(metadata.email_verification_code_hash).toBeTruthy()

    const code = sent.devCode as string
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
})

describe("buyer password reset", () => {
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
