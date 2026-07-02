import { createHash } from "node:crypto"
import {
  confirmCustomerEmailVerification,
  isEmailVerified,
  readEmailVerificationStatus,
  sendCustomerEmailVerification,
} from "../lib/email-verification"
import { validateCustomerAddressInput } from "../lib/customer-addresses"

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
    const hash = createHash("sha256").update("buyer@example.com:123456").digest("hex")
    const customerModule = {
      retrieveCustomer: jest.fn(async () => ({
        id: "cus_1",
        email: "buyer@example.com",
        metadata: {
          email_verification_code_hash: hash,
          email_verification_expires_at: new Date(Date.now() + 60_000).toISOString(),
          email_verification_sent_to: "buyer@example.com",
        },
      })),
      updateCustomers: jest.fn(),
    }
    const container = { resolve: () => customerModule }

    await expect(
      confirmCustomerEmailVerification(container as never, "cus_1", "000000")
    ).rejects.toThrow("Verification code is incorrect")
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
