import { Modules } from "@medusajs/framework/utils"
import paymentCapturedSyncHandler from "../subscribers/payment-captured-sync"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"

const mockMarkOrderPaidAndFulfillmentWaiting = jest.fn()
const mockTryRegisterWebhookDedupe = jest.fn()
const mockReleaseWebhookDedupe = jest.fn()
const mockPushOrderToS2bdiy = jest.fn()
const mockNotifyOrderPaid = jest.fn()
const mockSendOrderConfirmation = jest.fn()

jest.mock("../lib/sync-order-paid-fulfillment", () => ({
  markOrderPaidAndFulfillmentWaiting: (...args: unknown[]) =>
    mockMarkOrderPaidAndFulfillmentWaiting(...args),
}))

jest.mock("../lib/webhook-dedupe", () => ({
  tryRegisterWebhookDedupe: (...args: unknown[]) => mockTryRegisterWebhookDedupe(...args),
  releaseWebhookDedupe: (...args: unknown[]) => mockReleaseWebhookDedupe(...args),
}))

jest.mock("../lib/s2bdiy/push-s2b-order", () => ({
  pushOrderToS2bdiy: (...args: unknown[]) => mockPushOrderToS2bdiy(...args),
}))

jest.mock("../modules/suppliers/s2bdiy/config", () => ({
  getS2bdiyConfig: () => null,
}))

jest.mock("../lib/notifications", () => ({
  notifyFulfillmentFailed: jest.fn(),
  notifyOrderPaid: (...args: unknown[]) => mockNotifyOrderPaid(...args),
}))

jest.mock("../lib/email", () => ({
  sendOrderConfirmation: (...args: unknown[]) => mockSendOrderConfirmation(...args),
}))

const createContainer = () => {
  const paymentModule = {
    retrievePayment: jest.fn(async () => ({ payment_collection_id: "paycol_1" })),
  }
  const fulfillmentService = {
    listFulfillmentOrders: jest.fn(async () => [{ id: "fo_1", order_id: "order_1" }]),
  }
  const orderModule = {
    retrieveOrder: jest.fn(async () => ({
      id: "order_1",
      email: "buyer@example.com",
      total: 2500,
      currency_code: "usd",
      metadata: { store_id: "default_store" },
      items: [],
    })),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === Modules.PAYMENT) return paymentModule
      if (key === Modules.ORDER) return orderModule
      if (key === FULFILLMENT_ORDERS_MODULE) return fulfillmentService
      return {}
    }),
  }
  return { container, paymentModule, fulfillmentService, orderModule }
}

describe("payment.captured subscriber payment closure", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTryRegisterWebhookDedupe.mockResolvedValue(true)
    mockReleaseWebhookDedupe.mockResolvedValue(undefined)
    mockMarkOrderPaidAndFulfillmentWaiting.mockResolvedValue(undefined)
    mockNotifyOrderPaid.mockResolvedValue(undefined)
    mockSendOrderConfirmation.mockResolvedValue(undefined)
  })

  it("skips duplicate payment.captured events before paid side effects", async () => {
    mockTryRegisterWebhookDedupe.mockResolvedValue(false)
    const { container } = createContainer()

    await paymentCapturedSyncHandler({
      event: { data: { id: "pay_1" } },
      container,
    } as never)

    expect(mockMarkOrderPaidAndFulfillmentWaiting).not.toHaveBeenCalled()
    expect(mockNotifyOrderPaid).not.toHaveBeenCalled()
    expect(mockPushOrderToS2bdiy).not.toHaveBeenCalled()
  })

  it("releases payment.captured dedupe reservation when paid sync fails", async () => {
    mockMarkOrderPaidAndFulfillmentWaiting.mockRejectedValue(new Error("Order order_1 has multiple fulfillment orders: fo_1, fo_2"))
    const { container } = createContainer()

    await expect(paymentCapturedSyncHandler({
      event: { data: { id: "pay_1" } },
      container,
    } as never)).rejects.toThrow("multiple fulfillment orders")

    expect(mockReleaseWebhookDedupe).toHaveBeenCalledWith(container, "payment.captured:pay_1")
    expect(mockNotifyOrderPaid).not.toHaveBeenCalled()
    expect(mockPushOrderToS2bdiy).not.toHaveBeenCalled()
  })
})
