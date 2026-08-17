import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const mockReadActiveCheckoutPaymentAttempt = jest.fn()
const mockReadLatestCheckoutPaymentAttempt = jest.fn()
const mockReadAttemptPaymentSession = jest.fn()
const mockReadPaymentAttemptPaymentIntentId = jest.fn()
const mockReadStripePaymentIntentForAttempt = jest.fn()
const mockEnsureCartPaymentReady = jest.fn()
const mockFindCartPaymentSession = jest.fn()
const mockReadCartPaymentCollectionId = jest.fn()
const mockDeletePaymentSessionsRun = jest.fn()
const mockRetrievePayPalOrder = jest.fn()
const mockCreatePayPalOrder = jest.fn()
const mockUpdatePayPalOrder = jest.fn()
const mockIsCheckoutPaymentAttemptExpired = jest.fn()
const mockStripeApiRequest = jest.fn()

jest.mock("@medusajs/core-flows", () => ({
  deletePaymentSessionsWorkflow: jest.fn(() => ({ run: mockDeletePaymentSessionsRun })),
}))

jest.mock("../modules/paypal/client", () => ({
  decimalAmount: (amount: unknown, currencyCode: string) => {
    const digits = currencyCode.toLowerCase() === "jpy" ? 0 : 2
    return Number(amount).toFixed(digits)
  },
  getConfiguredPayPalClient: () => ({
    retrieveOrder: mockRetrievePayPalOrder,
    createOrder: mockCreatePayPalOrder,
    updateOrder: mockUpdatePayPalOrder,
  }),
  isPayPalResourceNotFoundError: (error: unknown) =>
    Boolean(error && typeof error === "object" && (error as { status?: unknown }).status === 404),
}))

jest.mock("../lib/checkout-payment-attempts", () => ({
  CHECKOUT_PAYMENT_ATTEMPT_WINDOW_MS: 15 * 60 * 1000,
  formatPaymentAttemptError: (error: unknown) =>
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error",
  isCheckoutPaymentAttemptExpired: (...args: unknown[]) => mockIsCheckoutPaymentAttemptExpired(...args),
  isPayPalProviderId: (providerId?: string | null) => Boolean(providerId?.startsWith("pp_paypal_")),
  isStripeProviderId: (providerId?: string | null) => Boolean(providerId?.startsWith("pp_stripe_")),
  normalizePayPalOrderStatus: () => "awaiting_payment",
  normalizeStripePaymentIntentStatus: (status?: string | null) =>
    status === "succeeded" ? "payment_succeeded" : status === "processing" ? "payment_processing" : "awaiting_payment",
  readActiveCheckoutPaymentAttempt: (...args: unknown[]) => mockReadActiveCheckoutPaymentAttempt(...args),
  readLatestCheckoutPaymentAttempt: (...args: unknown[]) => mockReadLatestCheckoutPaymentAttempt(...args),
  readAttemptPaymentSession: (...args: unknown[]) => mockReadAttemptPaymentSession(...args),
  readPayPalOrderId: (session?: { data?: Record<string, unknown> | null }) =>
    typeof session?.data?.paypal_order_id === "string" ? session.data.paypal_order_id : null,
  readPayPalCaptureStatus: () => null,
  readPaymentAttemptPaymentIntentId: (...args: unknown[]) => mockReadPaymentAttemptPaymentIntentId(...args),
  readStripePaymentIntentForAttempt: (...args: unknown[]) => mockReadStripePaymentIntentForAttempt(...args),
}))

jest.mock("../lib/ensure-cart-payment-ready", () => ({
  ensureCartPaymentReady: (...args: unknown[]) => mockEnsureCartPaymentReady(...args),
  findCartPaymentSession: (...args: unknown[]) => mockFindCartPaymentSession(...args),
  readCartPaymentCollectionId: (...args: unknown[]) => mockReadCartPaymentCollectionId(...args),
}))

jest.mock("../lib/stripe-client", () => ({
  stripeApiRequest: (...args: unknown[]) => mockStripeApiRequest(...args),
  isStripeResourceNotFoundError: (error: unknown) =>
    Boolean(error && typeof error === "object" && (error as { status?: unknown }).status === 404),
}))

import { CHECKOUT_PAYMENT_ATTEMPTS_MODULE } from "../modules/checkout-payment-attempts"
import { POST as recoverPayment } from "../api/store/carts/[id]/payment-recovery/route"

type MockRes = MedusaResponse & {
  statusCode?: number
  body?: unknown
  status: jest.Mock
  json: jest.Mock
}

const createRes = (): MockRes => {
  const res: Partial<MockRes> = {}
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as MockRes["status"]
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res
  }) as unknown as MockRes["json"]
  return res as MockRes
}

const createReq = () => {
  let attemptRecord: Record<string, unknown> | null = null
  const cartModule = {
    retrieveCart: jest.fn(async () => ({
      id: "cart_1",
      customer_id: "cus_1",
      email: "buyer@example.com",
      metadata: { store_id: "default_store" },
    })),
  }
  const attemptService = {
    createCheckoutPaymentAttempts: jest.fn(async (input: Record<string, unknown>) => {
      attemptRecord = {
        id: "cpa_1",
        ...input,
      }
      return attemptRecord
    }),
    updateCheckoutPaymentAttempts: jest.fn(async (input: Record<string, unknown>) => {
      attemptRecord = {
        ...(attemptRecord ?? {
          id: input.id,
          cart_id: "cart_1",
          store_id: "default_store",
          customer_id: "cus_1",
          provider_id: "pp_stripe_stripe",
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        }),
        ...input,
      }
      return attemptRecord
    }),
  }
  const query = { graph: jest.fn() }
  const paymentModule = { updatePaymentSession: jest.fn(async (input: unknown) => input) }
  const req = {
    params: { id: "cart_1" },
    body: { provider_id: "pp_stripe_stripe" },
    headers: {
      "x-publishable-api-key": "pk_test",
      "x-store-id": "default_store",
    },
    auth_context: { actor_id: "cus_1" },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return cartModule
        if (key === CHECKOUT_PAYMENT_ATTEMPTS_MODULE) return attemptService
        if (key === Modules.PAYMENT) return paymentModule
        if (key === ContainerRegistrationKeys.QUERY) return query
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, cartModule, attemptService, paymentModule }
}

describe("POST /store/carts/:id/payment-recovery Stripe readiness", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsCheckoutPaymentAttemptExpired.mockReturnValue(false)
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue(null)
    mockReadLatestCheckoutPaymentAttempt.mockResolvedValue(null)
    mockReadAttemptPaymentSession.mockResolvedValue(null)
    mockEnsureCartPaymentReady.mockResolvedValue(undefined)
    mockReadCartPaymentCollectionId.mockResolvedValue("paycol_1")
    mockReadPaymentAttemptPaymentIntentId.mockReturnValue("pi_1")
    mockReadStripePaymentIntentForAttempt.mockResolvedValue({ id: "pi_1", status: "requires_payment_method", amount: 1243, currency: "usd" })
    mockStripeApiRequest.mockResolvedValue({ id: "pi_1", amount: 1243 })
    mockFindCartPaymentSession.mockResolvedValue({
      id: "ps_1",
      provider_id: "pp_stripe_stripe",
      status: "pending",
      amount: 12.43,
      currency_code: "usd",
      data: {
        id: "pi_1",
        client_secret: "pi_1_secret_test",
      },
    })
    mockDeletePaymentSessionsRun.mockResolvedValue({})
    mockRetrievePayPalOrder.mockResolvedValue({ id: "PAYPAL_ORDER_1", status: "CREATED" })
    mockCreatePayPalOrder.mockResolvedValue({ id: "PAYPAL_ORDER_CREATED", status: "CREATED" })
    mockUpdatePayPalOrder.mockResolvedValue({ id: "PAYPAL_ORDER_1", status: "CREATED" })
  })

  it("returns a Stripe payment session with client_secret so Elements can render", async () => {
    const { req } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockEnsureCartPaymentReady).toHaveBeenCalledWith(expect.anything(), "cart_1", "pp_stripe_stripe")
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      status: "awaiting_payment",
      payment_attempt: {
        cart_id: "cart_1",
        provider_id: "pp_stripe_stripe",
        payment_session_id: "ps_1",
        provider_payment_id: "pi_1",
        recovery_action: "confirm_payment",
      },
      payment_session: {
        id: "ps_1",
        provider_id: "pp_stripe_stripe",
        status: "pending",
        client_secret: "pi_1_secret_test",
      },
    })
    expect(mockStripeApiRequest).not.toHaveBeenCalled()
  })

  it("rejects a Stripe PaymentIntent whose provider amount is 100x too large", async () => {
    mockReadStripePaymentIntentForAttempt.mockResolvedValue({
      id: "pi_1",
      status: "requires_payment_method",
      amount: 124300,
      currency: "usd",
    })
    const { req } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toEqual({
      error: expect.objectContaining({ code: "PAYMENT_AMOUNT_MISMATCH" }),
    })
    expect(JSON.stringify(res.body)).not.toContain("pi_1_secret_test")
  })

  it("does not alter a succeeded Stripe PaymentIntent while recovering its order", async () => {
    mockReadStripePaymentIntentForAttempt.mockResolvedValue({ id: "pi_1", status: "succeeded", amount: 1243, currency: "usd" })
    const { req } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockStripeApiRequest).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("can reserve an unpaid checkout without creating a payment session", async () => {
    const { req } = createReq()
    req.body = { provider_id: "pp_stripe_stripe", reserve_only: true } as never
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockEnsureCartPaymentReady).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      status: "created",
      payment_attempt: {
        cart_id: "cart_1",
        provider_id: "pp_stripe_stripe",
        recovery_action: "confirm_payment",
      },
      payment_session: null,
    })
  })

  it("keeps an expired reservation expired instead of starting a fresh payment window", async () => {
    mockIsCheckoutPaymentAttemptExpired.mockReturnValue(true)
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_expired",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_stripe_stripe",
      status: "awaiting_payment",
      expires_at: new Date(Date.now() - 1),
    })
    const { req, attemptService } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(attemptService.createCheckoutPaymentAttempts).not.toHaveBeenCalled()
    expect(mockEnsureCartPaymentReady).not.toHaveBeenCalled()
    expect(res.body).toMatchObject({
      status: "expired",
      payment_attempt: { id: "cpa_expired", recovery_action: "expired" },
    })
  })

  it("returns a completed attempt instead of creating a new payment attempt", async () => {
    mockReadLatestCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_completed",
      cart_id: "cart_1",
      store_id: "default_store",
      provider_id: "pp_stripe_stripe",
      completed_order_id: "order_1",
      status: "completed",
      expires_at: new Date(Date.now() - 60_000),
    })
    const { req, attemptService } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(attemptService.createCheckoutPaymentAttempts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      status: "completed",
      order_id: "order_1",
      payment_attempt: { recovery_action: "completed" },
    })
  })

  it("does not revive an already expired reservation on a later refresh", async () => {
    mockReadLatestCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_expired",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_stripe_stripe",
      status: "expired",
      expires_at: new Date(Date.now() - 1),
    })
    const { req, attemptService } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(attemptService.createCheckoutPaymentAttempts).not.toHaveBeenCalled()
    expect(res.body).toMatchObject({
      status: "expired",
      payment_attempt: { id: "cpa_expired", recovery_action: "expired" },
    })
  })

  it("can switch an untouched active reservation to Stripe before payment starts", async () => {
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_1",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_system_default",
      payment_collection_id: null,
      payment_session_id: null,
      provider_payment_id: null,
      completed_order_id: null,
      status: "created",
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
      last_error: null,
    })
    const { req } = createReq()
    req.body = { provider_id: "pp_stripe_stripe" } as never
    const res = createRes()

    await recoverPayment(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockEnsureCartPaymentReady).toHaveBeenCalledWith(expect.anything(), "cart_1", "pp_stripe_stripe")
    expect(res.body).toMatchObject({
      payment_attempt: {
        id: "cpa_1",
        provider_id: "pp_stripe_stripe",
      },
    })
  })

  it("deletes the Stripe session before switching the active attempt to PayPal", async () => {
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_1",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_stripe_stripe",
      payment_collection_id: "paycol_1",
      payment_session_id: "ps_stripe",
      provider_payment_id: "pi_1",
      status: "payment_failed",
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    })
    mockReadAttemptPaymentSession
      .mockResolvedValueOnce({ id: "ps_stripe", provider_id: "pp_stripe_stripe" })
      .mockResolvedValueOnce(null)
    mockFindCartPaymentSession.mockResolvedValue({
      id: "ps_paypal",
      provider_id: "pp_paypal_paypal",
      status: "pending",
      amount: 1243,
      currency_code: "usd",
      data: { paypal_order_id: "PAYPAL_ORDER_1" },
    })
    const { req, attemptService, paymentModule } = createReq()
    req.body = { provider_id: "pp_paypal_paypal" } as never
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockDeletePaymentSessionsRun).toHaveBeenCalledWith({ input: { ids: ["ps_stripe"] } })
    expect(attemptService.createCheckoutPaymentAttempts).not.toHaveBeenCalled()
    expect(attemptService.updateCheckoutPaymentAttempts).toHaveBeenCalledWith(expect.objectContaining({
      id: "cpa_1",
      provider_id: "pp_paypal_paypal",
      payment_session_id: null,
      provider_payment_id: null,
    }))
    expect(mockEnsureCartPaymentReady).toHaveBeenCalledWith(expect.anything(), "cart_1", "pp_paypal_paypal")
    expect(paymentModule.updatePaymentSession).toHaveBeenCalledWith(expect.objectContaining({
      id: "ps_paypal",
      amount: 1243,
      currency_code: "usd",
      data: expect.objectContaining({
        cart_id: "cart_1",
        payment_attempt_id: "cpa_1",
        store_id: "default_store",
      }),
    }))
  })

  it("creates and links a PayPal Order when the Medusa session has no provider order id", async () => {
    mockFindCartPaymentSession
      .mockResolvedValueOnce({
        id: "ps_paypal",
        provider_id: "pp_paypal_paypal",
        status: "pending",
        amount: 1243,
        currency_code: "usd",
        data: {},
      })
      .mockResolvedValueOnce({
        id: "ps_paypal",
        provider_id: "pp_paypal_paypal",
        status: "pending",
        amount: 1243,
        currency_code: "usd",
        data: {
          id: "PAYPAL_ORDER_CREATED",
          paypal_order_id: "PAYPAL_ORDER_CREATED",
          medusa_payment_session_id: "ps_paypal",
        },
      })
    const { req, paymentModule } = createReq()
    req.body = { provider_id: "pp_paypal_paypal" } as never
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith({
      amount: 1243,
      currencyCode: "usd",
      referenceId: "cpa_1",
      customId: "ps_paypal",
      brandName: "CiiVerse",
      returnUrl: "http://127.0.0.1:5174/checkout?paypal_return=1",
      cancelUrl: "http://127.0.0.1:5174/checkout?paypal_cancel=1",
      requestId: "paypal-order:ps_paypal",
    })
    expect(paymentModule.updatePaymentSession).toHaveBeenCalledWith(expect.objectContaining({
      id: "ps_paypal",
      data: expect.objectContaining({
        id: "PAYPAL_ORDER_CREATED",
        paypal_order_id: "PAYPAL_ORDER_CREATED",
        medusa_payment_session_id: "ps_paypal",
      }),
    }))
    expect(res.body).toMatchObject({
      payment_attempt: {
        payment_session_id: "ps_paypal",
        provider_payment_id: "PAYPAL_ORDER_CREATED",
      },
      payment_session: {
        data: expect.objectContaining({ paypal_order_id: "PAYPAL_ORDER_CREATED" }),
      },
    })
  })

  it("synchronizes an unapproved PayPal Order with the payment session amount", async () => {
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_1",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_paypal_paypal",
      payment_collection_id: "paycol_1",
      payment_session_id: "ps_paypal",
      provider_payment_id: "PAYPAL_ORDER_1",
      status: "awaiting_payment",
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    })
    mockReadAttemptPaymentSession.mockResolvedValue({
      id: "ps_paypal",
      provider_id: "pp_paypal_paypal",
      amount: 180.44,
      currency_code: "hkd",
      data: { paypal_order_id: "PAYPAL_ORDER_1" },
    })
    mockRetrievePayPalOrder.mockResolvedValue({
      id: "PAYPAL_ORDER_1",
      status: "CREATED",
      purchase_units: [{
        reference_id: "cpa_1",
        custom_id: "ps_paypal",
        amount: { currency_code: "HKD", value: "238.92" },
      }],
    })
    const { req } = createReq()
    req.body = { provider_id: "pp_paypal_paypal" } as never
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockUpdatePayPalOrder).toHaveBeenCalledWith("PAYPAL_ORDER_1", expect.objectContaining({
      amount: 180.44,
      currencyCode: "hkd",
      referenceId: "cpa_1",
    }))
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("allows an unapproved PayPal order to switch back to Stripe", async () => {
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_1",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_paypal_paypal",
      payment_collection_id: "paycol_1",
      payment_session_id: "ps_paypal",
      provider_payment_id: "PAYPAL_ORDER_1",
      status: "awaiting_payment",
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    })
    mockReadAttemptPaymentSession.mockResolvedValue({ id: "ps_paypal", provider_id: "pp_paypal_paypal" })
    const { req } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockRetrievePayPalOrder).toHaveBeenCalledWith("PAYPAL_ORDER_1")
    expect(mockDeletePaymentSessionsRun).toHaveBeenCalledWith({ input: { ids: ["ps_paypal"] } })
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it.each(["APPROVED", "COMPLETED"])("rejects provider switching after PayPal is %s", async (paypalStatus) => {
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_1",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_paypal_paypal",
      payment_collection_id: "paycol_1",
      payment_session_id: "ps_paypal",
      provider_payment_id: "PAYPAL_ORDER_1",
      status: "requires_action",
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    })
    mockReadAttemptPaymentSession.mockResolvedValue({ id: "ps_paypal", provider_id: "pp_paypal_paypal" })
    mockRetrievePayPalOrder.mockResolvedValue({ id: "PAYPAL_ORDER_1", status: paypalStatus })
    const { req } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "PAYMENT_ATTEMPT_PROVIDER_LOCKED" } })
    expect(mockDeletePaymentSessionsRun).not.toHaveBeenCalled()
  })

  it("replaces a missing PayPal Order with one new Medusa payment session", async () => {
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_1",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_paypal_paypal",
      payment_collection_id: "paycol_1",
      payment_session_id: "ps_stale",
      provider_payment_id: "PAYPAL_STALE",
      status: "awaiting_payment",
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    })
    mockReadAttemptPaymentSession.mockResolvedValue({
      id: "ps_stale",
      provider_id: "pp_paypal_paypal",
      amount: 1243,
      currency_code: "usd",
      data: { paypal_order_id: "PAYPAL_STALE" },
    })
    mockFindCartPaymentSession.mockResolvedValue({
      id: "ps_fresh",
      provider_id: "pp_paypal_paypal",
      amount: 1243,
      currency_code: "usd",
      data: { paypal_order_id: "PAYPAL_FRESH" },
    })
    const { req, paymentModule } = createReq()
    paymentModule.updatePaymentSession
      .mockRejectedValueOnce(Object.assign(new Error("INVALID_RESOURCE_ID"), { status: 404 }))
      .mockResolvedValue({})
    const res = createRes()
    req.body = { provider_id: "pp_paypal_paypal" } as never

    await recoverPayment(req, res)

    expect(mockDeletePaymentSessionsRun).toHaveBeenCalledWith({ input: { ids: ["ps_stale"] } })
    expect(mockEnsureCartPaymentReady).toHaveBeenCalledWith(expect.anything(), "cart_1", "pp_paypal_paypal")
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      payment_attempt: { payment_session_id: "ps_fresh", provider_payment_id: "PAYPAL_FRESH" },
      payment_session: { id: "ps_fresh" },
    })
  })

  it("replaces a missing Stripe PaymentIntent with a fresh session", async () => {
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_1",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_stripe_stripe",
      payment_collection_id: "paycol_1",
      payment_session_id: "ps_stale",
      provider_payment_id: "pi_stale",
      status: "awaiting_payment",
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    })
    mockReadAttemptPaymentSession.mockResolvedValue({
      id: "ps_stale",
      provider_id: "pp_stripe_stripe",
      data: { id: "pi_stale", client_secret: "pi_stale_secret" },
    })
    mockFindCartPaymentSession.mockResolvedValue({
      id: "ps_fresh",
      provider_id: "pp_stripe_stripe",
      data: { id: "pi_fresh", client_secret: "pi_fresh_secret" },
    })
    mockReadStripePaymentIntentForAttempt.mockRejectedValueOnce(Object.assign(new Error("No such payment_intent"), {
      status: 404,
      stripeCode: "resource_missing",
    }))
    mockReadPaymentAttemptPaymentIntentId.mockReturnValue("pi_fresh")
    const { req } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockDeletePaymentSessionsRun).toHaveBeenCalledWith({ input: { ids: ["ps_stale"] } })
    expect(mockEnsureCartPaymentReady).toHaveBeenCalledWith(expect.anything(), "cart_1", "pp_stripe_stripe")
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      status: "awaiting_payment",
      payment_attempt: { payment_session_id: "ps_fresh", provider_payment_id: "pi_fresh" },
      payment_session: { id: "ps_fresh", client_secret: "pi_fresh_secret" },
    })
  })

  it("replaces a canceled Stripe PaymentIntent before the card form is rendered", async () => {
    mockReadActiveCheckoutPaymentAttempt.mockResolvedValue({
      id: "cpa_1",
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_1",
      provider_id: "pp_stripe_stripe",
      payment_collection_id: "paycol_1",
      payment_session_id: "ps_cancelled",
      provider_payment_id: "pi_cancelled",
      status: "payment_failed",
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    })
    mockReadAttemptPaymentSession.mockResolvedValue({
      id: "ps_cancelled",
      provider_id: "pp_stripe_stripe",
      amount: 1243,
      currency_code: "usd",
      data: { id: "pi_cancelled", client_secret: "pi_cancelled_secret" },
    })
    mockFindCartPaymentSession.mockResolvedValue({
      id: "ps_fresh",
      provider_id: "pp_stripe_stripe",
      amount: 1243,
      currency_code: "usd",
      data: { id: "pi_fresh", client_secret: "pi_fresh_secret" },
    })
    mockReadStripePaymentIntentForAttempt
      .mockResolvedValueOnce({ id: "pi_cancelled", status: "canceled", amount: 1243 })
      .mockResolvedValue({ id: "pi_fresh", status: "requires_payment_method", amount: 1243 })
    mockReadPaymentAttemptPaymentIntentId.mockReturnValue("pi_fresh")
    const { req } = createReq()
    const res = createRes()

    await recoverPayment(req, res)

    expect(mockDeletePaymentSessionsRun).toHaveBeenCalledWith({ input: { ids: ["ps_cancelled"] } })
    expect(mockEnsureCartPaymentReady).toHaveBeenCalledWith(expect.anything(), "cart_1", "pp_stripe_stripe")
    expect(res.body).toMatchObject({
      payment_session: { id: "ps_fresh", client_secret: "pi_fresh_secret" },
    })
  })
})
