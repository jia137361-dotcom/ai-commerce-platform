import { Modules } from "@medusajs/framework/utils"
import resetPayPalTestBuyerPassword from "../scripts/pay-paypal-reset-test-buyer-password"

const ORIGINAL_ENV = process.env

const createContainer = (overrides: {
  customers?: Array<{ id: string; email?: string | null }>
  providerIdentities?: Array<{ id: string; auth_identity_id?: string | null }>
  authIdentities?: Array<{ id: string; app_metadata?: Record<string, unknown> | null }>
  updateSuccess?: boolean
  verifiedCustomerId?: string
} = {}) => {
  const updateProvider = jest.fn().mockResolvedValue({
    success: overrides.updateSuccess ?? true,
    authIdentity: { id: "auth_identity_1", app_metadata: { customer_id: "cus_01KYXNV5932TGV6SKJ17F1J6T5" } },
  })
  const authenticate = jest.fn().mockResolvedValue({
    success: true,
    authIdentity: {
      id: "auth_identity_1",
      app_metadata: { customer_id: overrides.verifiedCustomerId ?? "cus_01KYXNV5932TGV6SKJ17F1J6T5" },
    },
  })
  const customerModule = {
    listCustomers: jest.fn().mockResolvedValue(overrides.customers ?? [{
      id: "cus_01KYXNV5932TGV6SKJ17F1J6T5",
      email: "mkt01_paypal_buyer_runtime_20260801_a@example.com",
    }]),
  }
  const authModule = {
    listProviderIdentities: jest.fn().mockResolvedValue(overrides.providerIdentities ?? [{
      id: "provider_identity_1",
      auth_identity_id: "auth_identity_1",
    }]),
    listAuthIdentities: jest.fn().mockResolvedValue(overrides.authIdentities ?? [{
      id: "auth_identity_1",
      app_metadata: { customer_id: "cus_01KYXNV5932TGV6SKJ17F1J6T5" },
    }]),
    updateProvider,
    authenticate,
  }

  return {
    container: {
      resolve: jest.fn((key) => {
        if (key === Modules.CUSTOMER) return customerModule
        if (key === Modules.AUTH) return authModule
        throw new Error(`Unexpected module ${String(key)}`)
      }),
    },
    customerModule,
    authModule,
  }
}

describe("pay-paypal reset test buyer password script", () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "development",
      PAY_PAYPAL_E2E_SETUP: "true",
      PAYPAL_ENVIRONMENT: "sandbox",
      PAY_PAYPAL_TEST_PASSWORD: "runtime-secret-from-env",
    }
    jest.spyOn(console, "log").mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    jest.restoreAllMocks()
  })

  it("requires explicit development and fixture setup guards before mutation", async () => {
    process.env.NODE_ENV = "test"
    const { container, authModule } = createContainer()

    await expect(resetPayPalTestBuyerPassword({ container } as never))
      .rejects.toThrow("NODE_ENV=development is required")

    expect(authModule.updateProvider).not.toHaveBeenCalled()
  })

  it("refuses to mutate when the target customer ID/email does not match exactly", async () => {
    const { container, authModule } = createContainer({
      customers: [{ id: "cus_other", email: "mkt01_paypal_buyer_runtime_20260801_a@example.com" }],
    })

    await expect(resetPayPalTestBuyerPassword({ container } as never))
      .rejects.toThrow("Target PayPal fixture customer ID/email did not match exactly")

    expect(authModule.updateProvider).not.toHaveBeenCalled()
  })

  it("updates only the exact PayPal fixture buyer emailpass identity", async () => {
    const { container, authModule } = createContainer()

    await resetPayPalTestBuyerPassword({ container } as never)

    expect(authModule.updateProvider).toHaveBeenCalledTimes(1)
    expect(authModule.updateProvider).toHaveBeenCalledWith("emailpass", {
      entity_id: "mkt01_paypal_buyer_runtime_20260801_a@example.com",
      password: "runtime-secret-from-env",
    })
    expect(authModule.authenticate).toHaveBeenCalledWith("emailpass", {
      body: {
        email: "mkt01_paypal_buyer_runtime_20260801_a@example.com",
        password: "runtime-secret-from-env",
      },
    })
  })
})
