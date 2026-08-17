import type { CompleteCartResponse } from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"
import { completeCheckoutOrder, completedRecoveryResult } from "./checkout-action"

const cart: StoreCart = { id: "cart_1", customerId: null, currencyCode: "usd", items: [], subtotal: 0, total: 0 }

describe("completeCheckoutOrder", () => {
  it("binds customer, saves contact, then calls the existing complete action once", async () => {
    const calls: string[] = []
    const bindCustomer = jest.fn(async () => { calls.push("bind"); return { ...cart, customerId: "cus_1" } })
    const saveContact = jest.fn(async (bound: StoreCart) => { calls.push("contact"); return bound })
    const complete = jest.fn(async (): Promise<CompleteCartResponse> => { calls.push("complete"); return { orderId: "order_1", storeId: "default_store" } })
    const result = await completeCheckoutOrder({ cart, customerId: "cus_1", bindCustomer, saveContact, complete })
    expect(calls).toEqual(["bind", "contact", "complete"])
    expect(complete).toHaveBeenCalledTimes(1)
    expect(result.result.orderId).toBe("order_1")
  })

  it("turns a completed payment recovery into the same completion result shape", () => {
    expect(completedRecoveryResult({
      cartId: "cart_1",
      status: "completed",
      orderId: "order_1",
      paymentIntentStatus: "succeeded",
      paymentSession: null,
      paymentAttempt: {
        id: "cpa_1",
        cartId: "cart_1",
        storeId: "default_store",
        customerId: "cus_1",
        providerId: "pp_stripe_stripe",
        paymentCollectionId: "paycol_1",
        paymentSessionId: "ps_1",
        providerPaymentId: "pi_1",
        completedOrderId: "order_1",
        status: "completed",
        expiresAt: null,
        lastError: null,
        recoveryAction: "completed",
      },
    }, "default_store")).toEqual({
      orderId: "order_1",
      storeId: "default_store",
      paymentProviderId: "pp_stripe_stripe",
      paymentStatus: "paid",
    })
  })
})
