import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/types"
import { AbstractPaymentProvider, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { PayPalClient, decimalAmount, isPayPalResourceNotFoundError, maskPayPalId } from "./client"
import type { PayPalOrder, PayPalProviderOptions } from "./types"

const readId = (data?: Record<string, unknown> | null) =>
  typeof data?.paypal_order_id === "string" && data.paypal_order_id.trim()
    ? data.paypal_order_id
    : null

const readCaptureId = (data?: Record<string, unknown> | null) =>
  typeof data?.paypal_capture_id === "string" ? data.paypal_capture_id : null

const readAmount = (value: unknown): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  if (value && typeof value === "object") {
    const candidate = value as { value?: unknown; numeric?: unknown }
    return readAmount(candidate.value ?? candidate.numeric)
  }
  return Number(value)
}

const firstCapture = (order: PayPalOrder) => order.purchase_units?.[0]?.payments?.captures?.[0] ?? null

const sessionData = (order: PayPalOrder, existing: Record<string, unknown> | null | undefined, currencyCode: string, amount: unknown) => {
  const capture = firstCapture(order)
  const orderId =
    order.id ||
    (typeof existing?.paypal_order_id === "string" ? existing.paypal_order_id : null) ||
    (typeof existing?.id === "string" ? existing.id : null)
  return {
    ...(existing ?? {}),
    id: orderId,
    paypal_order_id: orderId,
    paypal_status: order.status ?? null,
    paypal_capture_id: capture?.id ?? existing?.paypal_capture_id ?? null,
    paypal_capture_status: capture?.status ?? null,
    amount: readAmount(amount),
    currency: currencyCode.toLowerCase(),
    currency_code: currencyCode.toLowerCase(),
  }
}

const statusForOrder = (order: PayPalOrder) => {
  const captureStatus = String(firstCapture(order)?.status ?? "").toUpperCase()
  if (captureStatus === "COMPLETED") return PaymentSessionStatus.CAPTURED
  if (captureStatus === "PENDING") return PaymentSessionStatus.PENDING_AUTHORIZATION
  if (["DENIED", "DECLINED", "FAILED", "REVERSED"].includes(captureStatus)) return PaymentSessionStatus.ERROR
  const status = String(order.status ?? "").toUpperCase()
  if (status === "COMPLETED") return PaymentSessionStatus.PENDING_AUTHORIZATION
  if (status === "APPROVED") return PaymentSessionStatus.REQUIRES_MORE
  if (["VOIDED", "CANCELED", "CANCELLED"].includes(status)) return PaymentSessionStatus.CANCELED
  // Buyer still needs to approve in PayPal Checkout. Keep the Medusa session
  // processable so complete-cart can authorize after onApprove.
  if (status === "PAYER_ACTION_REQUIRED" || status === "CREATED") return PaymentSessionStatus.PENDING
  if (["FAILED", "DENIED"].includes(status)) return PaymentSessionStatus.ERROR
  return PaymentSessionStatus.PENDING
}

export default class PayPalPaymentProviderService extends AbstractPaymentProvider<PayPalProviderOptions> {
  static identifier = "paypal"
  private readonly client: PayPalClient
  private readonly options_: PayPalProviderOptions

  static validateOptions(options: PayPalProviderOptions) {
    if (!options.clientId || !options.clientSecret) throw new Error("PayPal client ID and secret are required")
    if (options.environment !== "sandbox") throw new Error("PayPal provider only supports sandbox in this environment")
  }

  constructor(container: Record<string, unknown>, options: PayPalProviderOptions) {
    super(container, options)
    PayPalPaymentProviderService.validateOptions(options)
    this.options_ = options
    this.client = new PayPalClient(options)
  }

  getIdentifier() {
    return PayPalPaymentProviderService.identifier
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const existingId = readId(input.data)
    if (existingId) {
      try {
        const existing = await this.client.retrieveOrder(existingId)
        return { id: existing.id, status: statusForOrder(existing), data: sessionData(existing, input.data, input.currency_code, input.amount) }
      } catch (error) {
        // A previously expired PayPal Order must not poison a new Medusa
        // payment session. It was not captured, so a fresh Order is safe.
        if (!isPayPalResourceNotFoundError(error)) throw error
      }
    }
    const order = await this.client.createOrder({
      amount: input.amount,
      currencyCode: input.currency_code,
      referenceId: String(input.context?.idempotency_key ?? "checkout"),
      customId: typeof input.data?.medusa_payment_session_id === "string" ? input.data.medusa_payment_session_id : undefined,
      brandName: this.options_.brandName,
      returnUrl: this.options_.returnUrl,
      cancelUrl: this.options_.cancelUrl,
      requestId: input.context?.idempotency_key,
    })
    return {
      id: order.id,
      status: statusForOrder(order),
      data: sessionData(order, input.data, input.currency_code, input.amount),
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const id = readId(input.data)
    if (!id) return this.initiatePayment(input)
    const current = await this.client.retrieveOrder(id)
    const currentAmount = current.purchase_units?.[0]?.amount?.value
    const nextAmount = decimalAmount(input.amount, input.currency_code)
    const needsAmountUpdate = currentAmount !== nextAmount && current.status === "CREATED"
    const medusaSessionId = typeof input.data?.medusa_payment_session_id === "string"
      ? input.data.medusa_payment_session_id
      : undefined
    const needsSessionLink = Boolean(
      medusaSessionId && current.purchase_units?.[0]?.custom_id !== medusaSessionId
    )
    const updated = needsAmountUpdate || needsSessionLink
      ? await this.client.updateOrder(id, {
          ...(needsAmountUpdate ? { amount: input.amount, currencyCode: input.currency_code } : {}),
          customId: needsSessionLink ? medusaSessionId : undefined,
          customIdExists: Boolean(current.purchase_units?.[0]?.custom_id),
          referenceId: current.purchase_units?.[0]?.reference_id,
          requestId: input.context?.idempotency_key,
        })
      : current
    return { status: statusForOrder(updated), data: sessionData(updated, input.data, input.currency_code, input.amount) }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const id = readId(input.data)
    if (!id) throw new Error("PayPal order ID is missing")
    const current = await this.client.retrieveOrder(id)
    if (current.status === "APPROVED") {
      const captured = await this.client.captureOrder(id, input.context?.idempotency_key)
      const data = sessionData(captured, input.data, String(input.data?.currency_code ?? input.data?.currency ?? "usd"), input.data?.amount)
      return { status: statusForOrder(captured), data }
    }
    const status = statusForOrder(current)
    if (status === PaymentSessionStatus.CAPTURED) return { status, data: sessionData(current, input.data, String(input.data?.currency_code ?? "usd"), input.data?.amount) }
    return { status, data: sessionData(current, input.data, String(input.data?.currency_code ?? "usd"), input.data?.amount) }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const id = readId(input.data)
    if (!id) throw new Error("PayPal order ID is missing")
    const current = await this.client.retrieveOrder(id)
    const captured = current.status === "APPROVED" ? await this.client.captureOrder(id, input.context?.idempotency_key) : current
    if (statusForOrder(captured) !== PaymentSessionStatus.CAPTURED) {
      throw new Error(`PayPal capture is not complete (${firstCapture(captured)?.status ?? captured.status ?? "unknown"})`)
    }
    return { data: sessionData(captured, input.data, String(input.data?.currency_code ?? "usd"), input.data?.amount) }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const id = readId(input.data)
    if (!id) return { data: input.data }
    let current: PayPalOrder
    try {
      current = await this.client.retrieveOrder(id)
    } catch (error) {
      // Deleting a stale Medusa session should succeed even when PayPal has
      // already discarded the corresponding unapproved Order.
      if (isPayPalResourceNotFoundError(error)) return { data: input.data }
      throw error
    }
    if (["COMPLETED", "VOIDED", "CANCELED", "CANCELLED"].includes(String(current.status).toUpperCase())) return { data: input.data }
    // PayPal Orders with CAPTURE intent have no cancel endpoint. Removing the
    // Medusa session deactivates the checkout while the external order expires.
    return { data: sessionData(current, input.data, String(input.data?.currency_code ?? "usd"), input.data?.amount) }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input)
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const id = readId(input.data)
    if (!id) throw new Error("PayPal order ID is missing")
    const order = await this.client.retrieveOrder(id)
    return { status: statusForOrder(order), data: sessionData(order, input.data, String(input.data?.currency_code ?? "usd"), input.data?.amount) }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const captureId = readCaptureId(input.data)
    if (!captureId) throw new Error("PayPal capture ID is missing for refund")
    const refund = await this.client.refundCapture(captureId, {
      amount: input.amount,
      currencyCode: String(input.data?.currency_code ?? input.data?.currency ?? "usd"),
      requestId:
        typeof input.data?.refund_idempotency_key === "string"
          ? input.data.refund_idempotency_key
          : input.context?.idempotency_key,
    })
    return {
      data: {
        ...(input.data ?? {}),
        paypal_capture_id: captureId,
        paypal_refund_id: refund.id ?? null,
        paypal_refund_status: refund.status ?? null,
      },
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const id = readId(input.data)
    if (!id) return { data: input.data }
    const order = await this.client.retrieveOrder(id)
    return { data: sessionData(order, input.data, String(input.data?.currency_code ?? "usd"), input.data?.amount) }
  }

  async getWebhookActionAndData(payload: { data: Record<string, unknown>; rawData: string | Buffer; headers: Record<string, unknown> }): Promise<WebhookActionResult> {
    const event = await this.client.verifyWebhook({ rawData: payload.rawData, headers: payload.headers })
    const resource = event.resource ?? {}
    const related = (resource.supplementary_data as { related_ids?: { order_id?: string } } | undefined)?.related_ids
    const purchaseUnits = Array.isArray(resource.purchase_units)
      ? resource.purchase_units as Array<{ custom_id?: unknown }>
      : []
    let sessionId =
      typeof resource.custom_id === "string"
        ? resource.custom_id
        : typeof resource.invoice_id === "string"
          ? resource.invoice_id
          : typeof purchaseUnits[0]?.custom_id === "string"
            ? purchaseUnits[0].custom_id
            : null
    if (!sessionId && typeof related?.order_id === "string") {
      const order = await this.client.retrieveOrder(related.order_id)
      const customId = order.purchase_units?.[0]?.custom_id
      sessionId = typeof customId === "string" ? customId : null
    }
    const eventType = String(event.event_type ?? "")
    const amount = Number((resource.amount as { value?: string } | undefined)?.value ?? 0)
    if (!sessionId) return { action: PaymentActions.NOT_SUPPORTED }
    if (["PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.REFUNDED"].includes(eventType)) {
      return { action: PaymentActions.SUCCESSFUL, data: { session_id: sessionId, amount } }
    }
    if (["PAYMENT.CAPTURE.PENDING"].includes(eventType)) {
      return { action: PaymentActions.PENDING, data: { session_id: sessionId, amount } }
    }
    if (["PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REVERSED"].includes(eventType)) {
      return { action: PaymentActions.FAILED, data: { session_id: sessionId, amount } }
    }
    if (["CHECKOUT.ORDER.APPROVED", "PAYMENT.AUTHORIZATION.CREATED"].includes(eventType)) {
      return { action: PaymentActions.AUTHORIZED, data: { session_id: sessionId, amount } }
    }
    return { action: PaymentActions.NOT_SUPPORTED, data: { session_id: sessionId, amount } }
  }

  // Kept as a small diagnostic hook for provider-focused tests without exposing credentials.
  maskExternalId(value: unknown) {
    return maskPayPalId(value)
  }
}
