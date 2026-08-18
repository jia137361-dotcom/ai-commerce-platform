import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { processPaymentWorkflow } from "@medusajs/core-flows"
import { Modules, PaymentActions, PaymentWebhookEvents } from "@medusajs/framework/utils"
import { releaseWebhookDedupe, tryRegisterWebhookDedupe } from "../../../../lib/webhook-dedupe"
import { BUYER_REFUND_REQUESTS_MODULE } from "../../../../modules/buyer-refund-requests"
import { cancelReferralCommissionForOrder } from "../../../../lib/referral-program"

type RawRequest = MedusaRequest & { rawBody?: Buffer | string }

const rawBody = (req: RawRequest) => {
  if (req.rawBody) return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody)
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === "string") return Buffer.from(req.body)
  return Buffer.from(JSON.stringify(req.body ?? {}))
}

const eventIdFrom = (body: unknown) => {
  const value = body && typeof body === "object" ? (body as { id?: unknown }).id : null
  return typeof value === "string" && value.trim() ? value.trim() : null
}

const reconcileRefundWebhook = async (req: MedusaRequest, event: Record<string, unknown>) => {
  const resource = (event.resource ?? {}) as Record<string, unknown>
  const refundId = typeof resource.id === "string" ? resource.id : null
  if (!refundId) return
  const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as {
    listBuyerRefundRequests: (filters: Record<string, unknown>) => Promise<Array<{
      id: string
      status?: string
      approved_amount?: unknown
      eligible_amount?: unknown
      requested_amount?: unknown
      order_id?: string
    }>>
    updateBuyerRefundRequests: (input: Record<string, unknown>) => Promise<unknown>
  }
  const matches = await service.listBuyerRefundRequests({ external_refund_id: [refundId] })
  const eventType = String(event.event_type ?? "")
  for (const match of matches) {
    const approvedAmount = Number(match.approved_amount ?? match.requested_amount ?? 0)
    const eligibleAmount = Number(match.eligible_amount ?? match.requested_amount ?? 0)
    const completedStatus = approvedAmount > 0 && eligibleAmount > approvedAmount
      ? "partially_refunded"
      : "refunded"
    const nextStatus = eventType === "PAYMENT.CAPTURE.REFUNDED"
      ? completedStatus
      : /FAILED|DENIED|REVERSED/.test(eventType)
        ? "refund_failed"
        : "refund_pending"
    await service.updateBuyerRefundRequests({
      id: match.id,
      status: nextStatus,
      provider_status: eventType,
      processed_at: ["refunded", "partially_refunded"].includes(nextStatus) ? new Date() : null,
      failed_at: nextStatus === "refund_failed" ? new Date() : null,
    })
    if (["refunded", "partially_refunded"].includes(nextStatus) && match.order_id) {
      await cancelReferralCommissionForOrder(req.scope, match.order_id, "order_refund")
    }
  }
}

export const POST = async (req: RawRequest, res: MedusaResponse) => {
  const provider = String(req.params.provider ?? "")
  const body = (req.body ?? {}) as Record<string, unknown>
  const raw = rawBody(req)
  let registeredDedupeKey: string | null = null
  try {
    const paymentModule = req.scope.resolve(Modules.PAYMENT) as {
      getWebhookActionAndData: (input: { provider: string; payload: { data: Record<string, unknown>; rawData: Buffer; headers: Record<string, unknown> } }) => Promise<{ action: string; data?: { session_id?: string } }>
    }
    const webhook = await paymentModule.getWebhookActionAndData({
      provider,
      payload: { data: body, rawData: raw, headers: req.headers as Record<string, unknown> },
    })
    const eventId = eventIdFrom(body)
    if (provider.toLowerCase().includes("paypal") && eventId) {
      const dedupeKey = `paypal:${eventId}`
      const firstTime = await tryRegisterWebhookDedupe(req.scope, dedupeKey, "paypal.webhook")
      if (!firstTime) return res.status(200).json({ received: true, duplicate: true })
      registeredDedupeKey = dedupeKey
      if (String(body.event_type ?? "").includes("REFUND")) {
        await reconcileRefundWebhook(req, body)
        return res.status(200).json({ received: true, duplicate: false })
      }
    }
    if (!webhook.data?.session_id || [PaymentActions.NOT_SUPPORTED, PaymentActions.CANCELED, PaymentActions.FAILED, PaymentActions.REQUIRES_MORE, PaymentActions.PENDING_AUTHORIZATION].includes(webhook.action as PaymentActions)) {
      return res.status(200).json({ received: true, action: webhook.action })
    }
    await processPaymentWorkflow(req.scope).run({ input: webhook as never })
    return res.status(200).json({ received: true, action: webhook.action })
  } catch (error) {
    if (registeredDedupeKey) {
      await releaseWebhookDedupe(req.scope, registeredDedupeKey).catch(() => undefined)
    }
    console.error("[payment-webhook] provider processing failed", {
      provider,
      message: error instanceof Error ? error.message : "unknown",
    })
    return res.status(400).json({ error: "Webhook verification or processing failed" })
  }
}

export const config = {
  bodyParser: false,
  event: PaymentWebhookEvents.WebhookReceived,
}
