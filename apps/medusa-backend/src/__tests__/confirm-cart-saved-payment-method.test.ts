import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const mockAssertCartBelongsToCurrentStore = jest.fn()
const mockEnsureCartPaymentReady = jest.fn()
const mockFindCartPaymentSession = jest.fn()
const mockEnsureStripeCustomerId = jest.fn()
const mockListCustomerPaymentMethodRecords = jest.fn()
const mockStripeApiRequest = jest.fn()

jest.mock("../lib/assert-cart-store", () => ({
  assertCartBelongsToCurrentStore: (...args: unknown[]) => mockAssertCartBelongsToCurrentStore(...args),
}))

jest.mock("../lib/ensure-cart-payment-ready", () => ({
  ensureCartPaymentReady: (...args: unknown[]) => mockEnsureCartPaymentReady(...args),
  findCartPaymentSession: (...args: unknown[]) => mockFindCartPaymentSession(...args),
  readCartPaymentCollectionId: jest.fn(),
}))

jest.mock("../lib/customer-payment-methods", () => ({
  ensureStripeCustomerId: (...args: unknown[]) => mockEnsureStripeCustomerId(...args),
  listCustomerPaymentMethodRecords: (...args: unknown[]) => mockListCustomerPaymentMethodRecords(...args),
}))

jest.mock("../lib/stripe-client", () => ({
  stripeApiRequest: (...args: unknown[]) => mockStripeApiRequest(...args),
}))

import { confirmCartWithSavedPaymentMethod } from "../lib/confirm-cart-saved-payment-method"

describe("confirmCartWithSavedPaymentMethod", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEnsureCartPaymentReady.mockResolvedValue(undefined)
    mockEnsureStripeCustomerId.mockResolvedValue("cus_buyer")
    mockListCustomerPaymentMethodRecords.mockResolvedValue({
      paymentMethods: [{ id: "pm_3155", type: "card", label: "VISA .... 3155" }],
    })
    mockFindCartPaymentSession.mockResolvedValue({
      id: "ps_1",
      provider_id: "pp_stripe_stripe",
      data: { id: "pi_3155", client_secret: "pi_3155_secret_original" },
    })
    mockStripeApiRequest
      .mockResolvedValueOnce({
        id: "pi_3155",
        customer: "cus_buyer",
      })
      .mockResolvedValueOnce({
        id: "pi_3155",
        customer: "cus_buyer",
        status: "requires_payment_method",
        client_secret: "pi_3155_secret_3ds",
      })
      .mockResolvedValueOnce({
        id: "pi_3155",
        customer: "cus_buyer",
        status: "requires_action",
        client_secret: "pi_3155_secret_3ds",
      })
  })

  it("returns a client secret so Stripe.js can confirm a saved card and perform 3DS", async () => {
    const cartModule = {
      retrieveCart: jest.fn().mockResolvedValue({ id: "cart_1", customer_id: "customer_1" }),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return cartModule
        if (key === ContainerRegistrationKeys.QUERY) return { graph: jest.fn() }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    const result = await confirmCartWithSavedPaymentMethod(container as never, {
      req: {} as never,
      cartId: "cart_1",
      customerId: "customer_1",
      paymentMethodId: "pm_3155",
      returnUrl: "http://127.0.0.1:5174/checkout",
    })

    expect(result).toMatchObject({
      payment_intent_id: "pi_3155",
      payment_intent_status: "requires_action",
      client_secret: "pi_3155_secret_3ds",
      payment_method_label: "VISA .... 3155",
    })
    expect(mockStripeApiRequest).toHaveBeenLastCalledWith("/payment_intents/pi_3155/confirm", {
      method: "POST",
      params: {
        payment_method: "pm_3155",
        off_session: false,
        return_url: "http://127.0.0.1:5174/checkout",
      },
    })
  })

  it("performs the final manual confirmation after Stripe.js completes 3DS", async () => {
    mockStripeApiRequest
      .mockReset()
      .mockResolvedValueOnce({
        id: "pi_3155",
        customer: "cus_buyer",
      })
      .mockResolvedValueOnce({
        id: "pi_3155",
        customer: "cus_buyer",
        status: "requires_confirmation",
        client_secret: "pi_3155_secret_3ds",
      })
      .mockResolvedValueOnce({
        id: "pi_3155",
        status: "succeeded",
        client_secret: "pi_3155_secret_3ds",
      })
    const cartModule = {
      retrieveCart: jest.fn().mockResolvedValue({ id: "cart_1", customer_id: "customer_1" }),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return cartModule
        if (key === ContainerRegistrationKeys.QUERY) return { graph: jest.fn() }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    const result = await confirmCartWithSavedPaymentMethod(container as never, {
      req: {} as never,
      cartId: "cart_1",
      customerId: "customer_1",
      paymentMethodId: "pm_3155",
    })

    expect(result.payment_intent_status).toBe("succeeded")
    expect(mockStripeApiRequest).toHaveBeenLastCalledWith("/payment_intents/pi_3155/confirm", {
      method: "POST",
      params: { return_url: "http://127.0.0.1:5174/checkout" },
    })
  })
})
