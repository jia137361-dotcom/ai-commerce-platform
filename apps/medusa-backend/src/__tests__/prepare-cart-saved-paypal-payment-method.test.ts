import { Modules } from "@medusajs/framework/utils"

const mockCreatePaymentSessionsRun = jest.fn()
const mockResolvePayPalVaultPaymentMethod = jest.fn()
const mockReadCartPaymentCollectionId = jest.fn()
const mockListPaymentSessions = jest.fn()
const mockFindCartPaymentSession = jest.fn()
const mockSyncActiveCheckoutPaymentAttemptSession = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  createPaymentSessionsWorkflow: jest.fn(() => ({ run: mockCreatePaymentSessionsRun })),
}))
jest.mock("../lib/assert-cart-store", () => ({
  assertCartBelongsToCurrentStore: jest.fn(),
  readCartStoreId: (cart: { metadata?: { store_id?: string } }) => cart.metadata?.store_id ?? "default_store",
}))
jest.mock("../lib/customer-payment-methods", () => ({
  resolvePayPalVaultPaymentMethod: (...args: unknown[]) => mockResolvePayPalVaultPaymentMethod(...args),
}))
jest.mock("../lib/ensure-cart-payment-ready", () => ({
  readCartPaymentCollectionId: (...args: unknown[]) => mockReadCartPaymentCollectionId(...args),
  listPaymentSessions: (...args: unknown[]) => mockListPaymentSessions(...args),
  findCartPaymentSession: (...args: unknown[]) => mockFindCartPaymentSession(...args),
}))
jest.mock("../lib/checkout-payment-attempts", () => ({
  normalizePayPalOrderStatus: (status?: string, capture?: string) =>
    status === "COMPLETED" || capture === "COMPLETED" ? "payment_succeeded" : "awaiting_payment",
  readPayPalCaptureStatus: () => "COMPLETED",
  readPayPalOrderId: (session?: { data?: { paypal_order_id?: string } }) => session?.data?.paypal_order_id ?? null,
  syncActiveCheckoutPaymentAttemptSession: (...args: unknown[]) => mockSyncActiveCheckoutPaymentAttemptSession(...args),
}))

import { prepareCartWithSavedPayPalPaymentMethod } from "../lib/prepare-cart-saved-paypal-payment-method"

describe("prepareCartWithSavedPayPalPaymentMethod", () => {
  it("links the active attempt to the newly created vault session and PayPal order", async () => {
    mockResolvePayPalVaultPaymentMethod.mockResolvedValue({ vault_id: "vault_1", label: "PayPal buyer@example.com" })
    mockReadCartPaymentCollectionId.mockResolvedValue("pay_col_1")
    mockListPaymentSessions.mockResolvedValue([{ id: "ps_old", provider_id: "pp_paypal_paypal" }])
    mockCreatePaymentSessionsRun.mockResolvedValue({})
    mockFindCartPaymentSession.mockResolvedValue({
      id: "ps_vault_new",
      provider_id: "pp_paypal_paypal",
      data: { paypal_order_id: "PAYPAL_VAULT_NEW", paypal_status: "COMPLETED" },
    })
    const deletePaymentSession = jest.fn().mockResolvedValue(undefined)
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return { retrieveCart: jest.fn().mockResolvedValue({ id: "cart_1", customer_id: "cus_1", metadata: { store_id: "store_1" } }) }
        if (key === Modules.PAYMENT) return { deletePaymentSession }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    await prepareCartWithSavedPayPalPaymentMethod(container as never, {
      req: {} as never,
      cartId: "cart_1",
      customerId: "cus_1",
      paymentMethodId: "paypal_saved_1",
    })

    expect(mockSyncActiveCheckoutPaymentAttemptSession).toHaveBeenCalledWith(expect.anything(), {
      cartId: "cart_1",
      storeId: "store_1",
      providerId: "pp_paypal_paypal",
      paymentCollectionId: "pay_col_1",
      paymentSessionId: "ps_vault_new",
      providerPaymentId: "PAYPAL_VAULT_NEW",
      status: "payment_succeeded",
    })
  })
})
