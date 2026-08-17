import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import PayPalPaymentProviderService from "../modules/paypal/service"
import { decimalAmount, PayPalClient } from "../modules/paypal/client"
import { normalizePayPalOrderStatus } from "../lib/checkout-payment-attempts"

const createProvider = () => {
  const provider = new PayPalPaymentProviderService({}, {
    clientId: "sandbox-client",
    clientSecret: "sandbox-secret",
    environment: "sandbox",
    webhookId: "sandbox-webhook",
  })
  const client = {
    createOrder: jest.fn(),
    retrieveOrder: jest.fn(),
    updateOrder: jest.fn(),
    captureOrder: jest.fn(),
    refundCapture: jest.fn(),
    verifyWebhook: jest.fn(),
  }
  Object.assign(provider as unknown as { client: typeof client }, { client })
  return { provider, client }
}

describe("PayPal sandbox payment provider", () => {
  it("formats Medusa amounts for PayPal without binary float drift", () => {
    expect(decimalAmount(12.5, "usd")).toBe("12.50")
    expect(decimalAmount({ value: "12.5" }, "usd")).toBe("12.50")
    expect(decimalAmount(1250, "jpy")).toBe("1250")
  })

  it("rejects every non-sandbox environment", () => {
    expect(() => PayPalPaymentProviderService.validateOptions({
      clientId: "client",
      clientSecret: "secret",
      environment: "live" as never,
    })).toThrow("sandbox")
  })

  it("normalizes PayPal recovery from capture status, not order status alone", () => {
    expect(normalizePayPalOrderStatus("COMPLETED", "PENDING")).toBe("payment_processing")
    expect(normalizePayPalOrderStatus("COMPLETED", "DENIED")).toBe("payment_failed")
    expect(normalizePayPalOrderStatus("COMPLETED", "COMPLETED")).toBe("payment_succeeded")
    expect(normalizePayPalOrderStatus("COMPLETED", null)).toBe("payment_processing")
  })

  it("treats PAYER_ACTION_REQUIRED as awaiting buyer action, not a hard failure", () => {
    expect(normalizePayPalOrderStatus("PAYER_ACTION_REQUIRED", null)).toBe("awaiting_payment")
    expect(normalizePayPalOrderStatus("DENIED", null)).toBe("payment_failed")
  })

  it("keeps PAYER_ACTION_REQUIRED sessions processable for cart complete", async () => {
    const { provider, client } = createProvider()
    client.createOrder.mockResolvedValue({ id: "PAYPAL_ORDER_ACTION", status: "PAYER_ACTION_REQUIRED" })

    const result = await provider.initiatePayment({
      amount: 677,
      currency_code: "usd",
      context: { idempotency_key: "attempt_action_required" },
    })

    expect(result.status).toBe(PaymentSessionStatus.PENDING)
    expect(result.status).not.toBe(PaymentSessionStatus.ERROR)
  })

  it("creates one PayPal order and reuses an existing provider order", async () => {
    const { provider, client } = createProvider()
    client.createOrder.mockResolvedValue({ id: "PAYPAL_ORDER_1", status: "CREATED" })
    client.retrieveOrder.mockResolvedValue({ id: "PAYPAL_ORDER_1", status: "CREATED" })
    const first = await provider.initiatePayment({ amount: 20, currency_code: "usd", context: { idempotency_key: "attempt_1" } })
    const second = await provider.initiatePayment({ amount: 20, currency_code: "usd", data: first.data })
    expect(first.id).toBe("PAYPAL_ORDER_1")
    expect(second.id).toBe("PAYPAL_ORDER_1")
    expect(client.createOrder).toHaveBeenCalledTimes(1)
  })

  it("does not treat a Medusa session id as a PayPal order id", async () => {
    const { provider, client } = createProvider()
    client.createOrder.mockResolvedValue({ id: "PAYPAL_ORDER_2", status: "CREATED" })

    const result = await provider.initiatePayment({
      amount: 1250,
      currency_code: "usd",
      data: { id: "payses_1" },
      context: { idempotency_key: "attempt_2" },
    })

    expect(client.retrieveOrder).not.toHaveBeenCalled()
    expect(client.createOrder).toHaveBeenCalledTimes(1)
    expect(result.id).toBe("PAYPAL_ORDER_2")
  })

  it("recreates a missing unapproved PayPal order instead of failing recovery", async () => {
    const { provider, client } = createProvider()
    client.retrieveOrder.mockRejectedValue(Object.assign(new Error("INVALID_RESOURCE_ID"), {
      status: 404,
      paypalIssue: "INVALID_RESOURCE_ID",
    }))
    client.createOrder.mockResolvedValue({ id: "PAYPAL_ORDER_3", status: "CREATED" })

    const result = await provider.initiatePayment({
      amount: 1250,
      currency_code: "usd",
      data: { paypal_order_id: "STALE_PAYPAL_ORDER" },
      context: { idempotency_key: "attempt_3" },
    })

    expect(client.createOrder).toHaveBeenCalledTimes(1)
    expect(result.id).toBe("PAYPAL_ORDER_3")
  })

  it("captures an approved order once and reports captured on retry", async () => {
    const { provider, client } = createProvider()
    client.retrieveOrder
      .mockResolvedValueOnce({ id: "PAYPAL_ORDER_1", status: "APPROVED" })
      .mockResolvedValueOnce({ id: "PAYPAL_ORDER_1", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAPTURE_1", status: "COMPLETED" }] } }] })
    client.captureOrder.mockResolvedValue({ id: "PAYPAL_ORDER_1", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAPTURE_1", status: "COMPLETED" }] } }] })
    const first = await provider.authorizePayment({ data: { paypal_order_id: "PAYPAL_ORDER_1", amount: 20, currency: "usd" }, context: { idempotency_key: "session_1" } })
    const second = await provider.authorizePayment({ data: first.data, context: { idempotency_key: "session_1" } })
    expect(first.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(second.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(client.captureOrder).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["PENDING", PaymentSessionStatus.PENDING_AUTHORIZATION],
    ["DENIED", PaymentSessionStatus.ERROR],
  ])("does not treat a %s capture as paid", async (captureStatus, expectedStatus) => {
    const { provider, client } = createProvider()
    client.retrieveOrder.mockResolvedValue({ id: "PAYPAL_ORDER_1", status: "APPROVED" })
    client.captureOrder.mockResolvedValue({
      id: "PAYPAL_ORDER_1",
      status: "COMPLETED",
      purchase_units: [{ payments: { captures: [{ id: "CAPTURE_1", status: captureStatus }] } }],
    })

    const result = await provider.authorizePayment({
      data: { paypal_order_id: "PAYPAL_ORDER_1", amount: 20, currency: "usd" },
      context: { idempotency_key: "session_1" },
    })

    expect(result.status).toBe(expectedStatus)
  })

  it("updates a created PayPal order when the cart amount changes", async () => {
    const { provider, client } = createProvider()
    client.retrieveOrder.mockResolvedValue({
      id: "PAYPAL_ORDER_1",
      status: "CREATED",
      purchase_units: [{ custom_id: "payses_1", amount: { value: "20.00", currency_code: "USD" } }],
    })
    client.updateOrder.mockResolvedValue({
      id: "PAYPAL_ORDER_1",
      status: "CREATED",
      purchase_units: [{ custom_id: "payses_1", amount: { value: "22.00", currency_code: "USD" } }],
    })

    await provider.updatePayment({
      amount: 22,
      currency_code: "usd",
      data: { paypal_order_id: "PAYPAL_ORDER_1", medusa_payment_session_id: "payses_1" },
      context: { idempotency_key: "attempt_1" },
    })

    expect(client.updateOrder).toHaveBeenCalledWith("PAYPAL_ORDER_1", expect.objectContaining({ amount: 22, currencyCode: "usd" }))
  })

  it("preserves the existing PayPal order id when a retrieved order omits id", async () => {
    const { provider, client } = createProvider()
    client.retrieveOrder.mockResolvedValue({
      status: "CREATED",
      purchase_units: [{ custom_id: "payses_1", amount: { value: "20.00", currency_code: "USD" } }],
    })

    const result = await provider.updatePayment({
      amount: 20,
      currency_code: "usd",
      data: { paypal_order_id: "PAYPAL_ORDER_1", medusa_payment_session_id: "payses_1" },
      context: { idempotency_key: "attempt_1" },
    })

    expect(result.data?.paypal_order_id).toBe("PAYPAL_ORDER_1")
    expect(result.data?.id).toBe("PAYPAL_ORDER_1")
  })

  it("uses PayPal's reference-id JSON Patch selector when recovery links a session", async () => {
    const client = new PayPalClient({
      clientId: "sandbox-client",
      clientSecret: "sandbox-secret",
      environment: "sandbox",
    })
    const request = jest.spyOn(client, "request").mockResolvedValue({
      id: "PAYPAL_ORDER_1",
      status: "CREATED",
    })

    await client.updateOrder("PAYPAL_ORDER_1", {
      amount: 22,
      currencyCode: "usd",
      customId: "payses_1",
      customIdExists: false,
      referenceId: "checkout_attempt_1",
      requestId: "attempt_1",
    })

    expect(request).toHaveBeenCalledWith(
      "/v2/checkout/orders/PAYPAL_ORDER_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify([
          {
            op: "replace",
            path: "/purchase_units/@reference_id=='checkout_attempt_1'/amount",
            value: { currency_code: "USD", value: "22.00" },
          },
          {
            op: "add",
            path: "/purchase_units/@reference_id=='checkout_attempt_1'/custom_id",
            value: "payses_1",
          },
        ]),
      }),
      "attempt_1"
    )
  })

  it("creates Orders v2 payload with PayPal experience context", async () => {
    const client = new PayPalClient({
      clientId: "sandbox-client",
      clientSecret: "sandbox-secret",
      environment: "sandbox",
    })
    const request = jest.spyOn(client, "request").mockResolvedValue({
      id: "PAYPAL_ORDER_1",
      status: "CREATED",
    })

    await client.createOrder({
      amount: 44,
      currencyCode: "usd",
      referenceId: "cpa_1",
      customId: "payses_1",
      brandName: "CiiVerse",
      returnUrl: "http://127.0.0.1:5174/checkout?paypal_return=1",
      cancelUrl: "http://127.0.0.1:5174/checkout?paypal_cancel=1",
      requestId: "paypal-order:payses_1:attempt:2",
    })

    expect(request).toHaveBeenCalledWith(
      "/v2/checkout/orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: "cpa_1",
            custom_id: "payses_1",
            amount: { currency_code: "USD", value: "44.00" },
          }],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: "CiiVerse",
                return_url: "http://127.0.0.1:5174/checkout?paypal_return=1",
                cancel_url: "http://127.0.0.1:5174/checkout?paypal_cancel=1",
                user_action: "PAY_NOW",
                shipping_preference: "NO_SHIPPING",
              },
            },
          },
        }),
      }),
      "paypal-order:payses_1:attempt:2"
    )
  })

  it("creates an Orders v2 payload with a saved PayPal vault token", async () => {
    const client = new PayPalClient({
      clientId: "sandbox-client",
      clientSecret: "sandbox-secret",
      environment: "sandbox",
    })
    const request = jest.spyOn(client, "request").mockResolvedValue({ id: "PAYPAL_ORDER_1", status: "CREATED" })

    await client.createOrder({
      amount: 4400,
      currencyCode: "usd",
      referenceId: "cpa_1",
      vaultId: "vlt_example",
    })

    expect(request).toHaveBeenCalledWith(
      "/v2/checkout/orders",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"vault_id":"vlt_example"'),
      }),
      undefined
    )
  })

  it("requests a PayPal Vault user id token for buyer account binding", async () => {
    const client = new PayPalClient({
      clientId: "sandbox-client",
      clientSecret: "sandbox-secret",
      environment: "sandbox",
    })
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: "id_token_1" }),
    } as Response)

    const token = await client.createVaultUserIdToken({
      targetCustomerId: "PAYPAL_CUSTOMER_1",
    })

    expect(token.id_token).toBe("id_token_1")
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      expect.objectContaining({
        method: "POST",
        body: "grant_type=client_credentials&response_type=id_token&target_customer_id=PAYPAL_CUSTOMER_1",
      })
    )
    fetchMock.mockRestore()
  })

  it("uses the refund request as the stable PayPal request key", async () => {
    const { provider, client } = createProvider()
    client.refundCapture.mockResolvedValue({ id: "REFUND_1", status: "PENDING" })
    const result = await provider.refundPayment({
      amount: 5,
      data: { paypal_capture_id: "CAPTURE_1", currency: "usd", refund_idempotency_key: "brr_1" },
      context: { idempotency_key: "medusa_refund_1" },
    })
    expect(client.refundCapture).toHaveBeenCalledWith("CAPTURE_1", expect.objectContaining({ requestId: "brr_1" }))
    expect(result.data?.paypal_refund_status).toBe("PENDING")
  })

  it("resolves capture webhooks through the related PayPal order", async () => {
    const { provider, client } = createProvider()
    client.verifyWebhook.mockResolvedValue({
      id: "WH_1",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        amount: { value: "20.00", currency_code: "USD" },
        supplementary_data: { related_ids: { order_id: "PAYPAL_ORDER_1" } },
      },
    })
    client.retrieveOrder.mockResolvedValue({
      id: "PAYPAL_ORDER_1",
      status: "COMPLETED",
      purchase_units: [{ custom_id: "payses_1" }],
    })
    const result = await provider.getWebhookActionAndData({ data: {}, rawData: "{}", headers: {} })
    expect(result).toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: "payses_1", amount: 20 } })
  })
})
