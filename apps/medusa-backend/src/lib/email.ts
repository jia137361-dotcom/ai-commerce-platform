import { Resend } from "resend"

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (resendClient) return resendClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resendClient = new Resend(apiKey)
  return resendClient
}

const FROM_EMAIL = process.env.EMAIL_FROM || "CitiGoo <noreply@citigoo.app>"

export type EmailResult = { success: boolean; id?: string; error?: string }

async function sendEmail(input: {
  to: string
  subject: string
  html: string
}): Promise<EmailResult> {
  const client = getResendClient()
  if (!client) {
    console.warn("[email] RESEND_API_KEY not configured, skipping email to", input.to)
    return { success: false, error: "Email service not configured" }
  }

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    })
    console.info("[email] Sent:", input.subject, "→", input.to, "id:", result.data?.id)
    return { success: true, id: result.data?.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error"
    console.error("[email] Failed to send:", input.subject, "→", input.to, message)
    return { success: false, error: message }
  }
}

export async function sendOrderConfirmation(input: {
  to: string
  orderId: string
  displayId?: number | null
  items: Array<{ title: string; quantity: number; price: number }>
  total: number
  currency?: string
}): Promise<EmailResult> {
  const label = input.displayId != null ? `#${input.displayId}` : input.orderId
  const currency = (input.currency || "usd").toUpperCase()
  const itemRows = input.items
    .map(
      (item) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.title}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${currency} ${(item.price / 100).toFixed(2)}</td></tr>`
    )
    .join("")

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h1 style="color:#1a1a1a">Order Confirmed ${label}</h1>
  <p>Thank you for your order! We've received your payment and are processing it now.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0">
    <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Price</th></tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot><tr style="font-weight:bold;border-top:2px solid #333"><td style="padding:8px" colspan="2">Total</td><td style="padding:8px;text-align:right">${currency} ${(input.total / 100).toFixed(2)}</td></tr></tfoot>
  </table>
  <p style="color:#666">Order ID: ${input.orderId}</p>
  <p style="color:#666">You can track your order status in your account.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:30px 0">
  <p style="color:#999;font-size:12px">CitiGoo - AI-powered custom products</p>
</body>
</html>`

  return sendEmail({
    to: input.to,
    subject: `Order ${label} Confirmed - CitiGoo`,
    html,
  })
}

export async function sendShippingNotification(input: {
  to: string
  orderId: string
  displayId?: number | null
  trackingNumber: string
  carrier: string
  trackingUrl?: string | null
}): Promise<EmailResult> {
  const label = input.displayId != null ? `#${input.displayId}` : input.orderId
  const trackLink = input.trackingUrl
    ? `<a href="${input.trackingUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px">Track Shipment</a>`
    : ""

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h1 style="color:#1a1a1a">Your Order Has Shipped!</h1>
  <p>Great news! Order ${label} is on its way to you.</p>
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:20px 0">
    <p style="margin:4px 0"><strong>Carrier:</strong> ${input.carrier}</p>
    <p style="margin:4px 0"><strong>Tracking Number:</strong> ${input.trackingNumber}</p>
  </div>
  ${trackLink}
  <p style="color:#666;margin-top:20px">Order ID: ${input.orderId}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:30px 0">
  <p style="color:#999;font-size:12px">CitiGoo - AI-powered custom products</p>
</body>
</html>`

  return sendEmail({
    to: input.to,
    subject: `Order ${label} Has Shipped - CitiGoo`,
    html,
  })
}

export async function sendNewsletterWelcome(input: {
  to: string
  storeName?: string
}): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h1 style="color:#1a1a1a">Welcome to ${input.storeName || "CitiGoo"}!</h1>
  <p>Thanks for subscribing. You'll be the first to know about new products, exclusive deals, and AI-powered custom creations.</p>
  <p style="color:#666">Stay tuned for updates!</p>
  <hr style="border:none;border-top:1px solid #eee;margin:30px 0">
  <p style="color:#999;font-size:12px">CitiGoo - AI-powered custom products</p>
</body>
</html>`

  return sendEmail({
    to: input.to,
    subject: `Welcome to ${input.storeName || "CitiGoo"}!`,
    html,
  })
}
