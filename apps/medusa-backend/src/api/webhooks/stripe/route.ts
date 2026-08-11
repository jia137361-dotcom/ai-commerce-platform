import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

function getRawBody(req: MedusaRequest): Buffer | null {
  const raw = (req as unknown as { rawBody?: Buffer }).rawBody
  if (raw && Buffer.isBuffer(raw)) return raw

  const body = req.body
  if (Buffer.isBuffer(body)) return body
  if (typeof body === "string") return Buffer.from(body)
  if (typeof body === "object" && body !== null) {
    return Buffer.from(JSON.stringify(body))
  }
  return null
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured")
      return res.status(500).json({ error: "Webhook secret not configured" })
    }

    const rawBody = getRawBody(req)
    if (!rawBody) {
      return res.status(400).json({ error: "Missing request body" })
    }

    const signature = req.headers["stripe-signature"] as string | undefined
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" })
    }

    const StripeModule = await import("stripe")
    const stripeInstance = new StripeModule.default(process.env.STRIPE_API_KEY!)

    let event: { type: string; id: string }
    try {
      event = stripeInstance.webhooks.constructEvent(
        rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown signature verification error"
      console.error("[stripe-webhook] Signature verification failed:", message)
      return res.status(400).json({ error: `Webhook signature verification failed: ${message}` })
    }

    console.info("[stripe-webhook] Received event:", event.type, event.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentModule = req.scope.resolve(Modules.PAYMENT) as any

    const getWebhookActionAndData = paymentModule.getWebhookActionAndData as (
      data: unknown
    ) => Promise<{ action: string; data: Record<string, unknown> }>

    const webhookResult = await getWebhookActionAndData({
      data: {
        rawData: rawBody,
        headers: { "stripe-signature": signature },
      },
    })

    console.info("[stripe-webhook] Processed:", event.type, "→ action:", webhookResult.action)

    res.status(200).json({ received: true, event_type: event.type })
  } catch (error) {
    console.error("[stripe-webhook] Handler error:", error)
    res.status(500).json({ error: "Webhook handler error" })
  }
}
