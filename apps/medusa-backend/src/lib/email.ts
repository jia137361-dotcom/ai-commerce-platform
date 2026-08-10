import { Resend } from "resend"
import { getAuthEmailDeliveryMode } from "./buyer-auth-policy"

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (resendClient) return resendClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resendClient = new Resend(apiKey)
  return resendClient
}

export type EmailResult = { success: boolean; id?: string; error?: string }

async function sendEmail(input: {
  kind: string
  to: string
  subject: string
  html: string
  idempotencyKey?: string
}): Promise<EmailResult> {
  const deliveryMode = getAuthEmailDeliveryMode()
  if (deliveryMode === "local") {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] production email delivery requires AUTH_EMAIL_DELIVERY_MODE=resend")
      return { success: false, error: "Email delivery is not configured." }
    }
    console.info("[email] local delivery mode skipped provider send", { kind: input.kind })
    return { success: true, id: "local" }
  }

  const from = process.env.EMAIL_FROM
  if (!from) {
    console.error("[email] EMAIL_FROM is required for Resend delivery", { kind: input.kind })
    return { success: false, error: "Email sender is not configured." }
  }

  const client = getResendClient()
  if (!client) {
    console.error("[email] RESEND_API_KEY is required for Resend delivery", { kind: input.kind })
    return { success: false, error: "Email delivery is not configured." }
  }

  try {
    const result = await client.emails.send({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined)
    if (result.error) {
      console.warn("[email] provider rejected message", {
        kind: input.kind,
        providerCode: summarizeProviderError(result.error),
      })
      return { success: false, error: "Email provider rejected the message." }
    }
    console.info("[email] provider accepted message", { kind: input.kind, id: result.data?.id ?? "unknown" })
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.warn("[email] provider send failed", {
      kind: input.kind,
      providerCode: summarizeProviderError(error),
    })
    return { success: false, error: "Email provider send failed." }
  }
}

function summarizeProviderError(error: unknown) {
  if (typeof error !== "object" || error === null) return "unknown"
  const record = error as Record<string, unknown>
  const code = typeof record.name === "string"
    ? record.name
    : typeof record.code === "string"
      ? record.code
      : "unknown"
  const status = typeof record.statusCode === "number"
    ? record.statusCode
    : typeof record.status === "number"
      ? record.status
      : undefined
  const message = typeof record.message === "string"
    ? record.message.replace(/\s+/g, " ").slice(0, 220)
    : ""
  return `${status ? `${code}:${status}` : code}${message ? ` ${message}` : ""}`
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
    kind: "order_confirmation",
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
    kind: "shipping_notification",
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
    kind: "newsletter_welcome",
    to: input.to,
    subject: `Welcome to ${input.storeName || "CitiGoo"}!`,
    html,
  })
}

const baseEmailShell = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#202636;background:#ffffff">
  <div style="border:1px solid #dfe3e8;border-radius:12px;padding:28px">
    <p style="margin:0 0 18px;color:#ff5a14;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Ciiverse</p>
    ${content}
  </div>
  <p style="color:#677083;font-size:12px;line-height:1.6;margin:18px 0 0">You received this email because someone requested account access for this address. If this wasn't you, you can safely ignore it.</p>
</body>
</html>`

export async function sendBuyerEmailVerificationCode(input: {
  to: string
  code: string
  expiresInMinutes: number
  idempotencyKey?: string
}): Promise<EmailResult> {
  return sendEmail({
    kind: "buyer_email_verification",
    to: input.to,
    subject: "Verify your Ciiverse email",
    idempotencyKey: input.idempotencyKey,
    html: baseEmailShell(`
      <h1 style="margin:0 0 12px;color:#202636;font-size:28px;line-height:1.2">Verify your email</h1>
      <p style="margin:0 0 20px;color:#4b5563;line-height:1.6">Enter this 6-digit verification code to finish setting up your Ciiverse buyer account.</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#202636;background:#f7f8fa;border-radius:10px;padding:18px 20px;text-align:center">${input.code}</div>
      <p style="margin:20px 0 0;color:#677083;line-height:1.6">This code expires in ${input.expiresInMinutes} minutes. You do not need to click a link.</p>
    `),
  })
}

export async function sendBuyerPasswordResetCode(input: {
  to: string
  code: string
  expiresInMinutes: number
  idempotencyKey?: string
}): Promise<EmailResult> {
  return sendEmail({
    kind: "buyer_password_reset",
    to: input.to,
    subject: "Reset your Ciiverse password",
    idempotencyKey: input.idempotencyKey,
    html: baseEmailShell(`
      <h1 style="margin:0 0 12px;color:#202636;font-size:28px;line-height:1.2">Reset your password</h1>
      <p style="margin:0 0 20px;color:#4b5563;line-height:1.6">Use this 6-digit reset code to choose a new password for your Ciiverse buyer account.</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#202636;background:#f7f8fa;border-radius:10px;padding:18px 20px;text-align:center">${input.code}</div>
      <p style="margin:20px 0 0;color:#677083;line-height:1.6">This code expires in ${input.expiresInMinutes} minutes and can be used once. You do not need to click a link.</p>
    `),
  })
}

export async function sendBuyerLoginOtpCode(input: {
  to: string
  code: string
  expiresInMinutes: number
  idempotencyKey?: string
}): Promise<EmailResult> {
  return sendEmail({
    kind: "buyer_login_otp",
    to: input.to,
    subject: "Your Ciiverse sign-in code",
    idempotencyKey: input.idempotencyKey,
    html: baseEmailShell(`
      <h1 style="margin:0 0 12px;color:#202636;font-size:28px;line-height:1.2">Sign in to Ciiverse</h1>
      <p style="margin:0 0 20px;color:#4b5563;line-height:1.6">Enter this 6-digit code to sign in or create your buyer account. No password needed.</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#202636;background:#f7f8fa;border-radius:10px;padding:18px 20px;text-align:center">${input.code}</div>
      <p style="margin:20px 0 0;color:#677083;line-height:1.6">This code expires in ${input.expiresInMinutes} minutes. You do not need to click a link.</p>
    `),
  })
}
