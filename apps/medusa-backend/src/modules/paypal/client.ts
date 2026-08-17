import { createHash } from "node:crypto"
import type {
  PayPalEnvironment,
  PayPalOrder,
  PayPalProviderOptions,
  PayPalRefund,
  PayPalUserIdToken,
  PayPalVaultPaymentToken,
  PayPalVaultSetupToken,
  PayPalWebhookEvent,
} from "./types"
import { currencyExponent, normalizeMajor } from "../../lib/money"

const REQUEST_TIMEOUT_MS = 20_000

const baseUrlFor = (environment: PayPalEnvironment) => {
  if (environment !== "sandbox") throw new Error("PayPal client only supports sandbox")
  return "https://api-m.sandbox.paypal.com"
}

const headerValue = (headers: Record<string, unknown>, name: string) => {
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()]
  return Array.isArray(value) ? String(value[0] ?? "") : typeof value === "string" ? value : ""
}

const requestId = (value: string | undefined, fallback: string) =>
  value?.startsWith("brr_")
    ? value.slice(0, 38)
    : createHash("sha256").update(value || fallback).digest("hex").slice(0, 38)

const rawString = (value: string | Buffer) => (Buffer.isBuffer(value) ? value.toString("utf8") : value)

const numericAmount = (amount: unknown): number => {
  if (typeof amount === "number") return amount
  if (typeof amount === "string") return Number(amount)
  if (amount && typeof amount === "object") {
    const value = amount as { value?: unknown; numeric?: unknown }
    return numericAmount(value.value ?? value.numeric)
  }
  return Number(amount)
}

export const decimalAmount = (amount: unknown, currencyCode: string) => {
  const numeric = numericAmount(amount)
  if (!Number.isFinite(numeric) || numeric < 0) throw new Error("Invalid PayPal amount")
  const digits = currencyExponent(currencyCode)
  return normalizeMajor(numeric, currencyCode).toFixed(digits)
}

export const isPayPalResourceNotFoundError = (error: unknown) => {
  const candidate = error as { status?: unknown; paypalIssue?: unknown } | null
  return candidate?.status === 404 || candidate?.paypalIssue === "INVALID_RESOURCE_ID"
}

export const maskPayPalId = (value: unknown) => {
  if (typeof value !== "string" || value.length < 6) return "paypal_id"
  return `${value.slice(0, 3)}...${value.slice(-3)}`
}

export class PayPalClient {
  private readonly baseUrl: string
  private accessToken: string | null = null
  private accessTokenExpiresAt = 0

  constructor(private readonly options: PayPalProviderOptions) {
    this.baseUrl = baseUrlFor(options.environment)
  }

  private async accessTokenValue() {
    if (this.accessToken && this.accessTokenExpiresAt > Date.now() + 30_000) return this.accessToken
    const encoded = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString("base64")
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number }
    if (!response.ok || !body.access_token) throw new Error("PayPal authentication failed")
    this.accessToken = body.access_token
    this.accessTokenExpiresAt = Date.now() + Math.max(60, Number(body.expires_in ?? 300)) * 1000
    return body.access_token
  }

  async request<T>(path: string, init: RequestInit = {}, stableRequestId?: string, attempt = 0): Promise<T> {
    const token = await this.accessTokenValue()
    const headers = new Headers(init.headers)
    headers.set("Authorization", `Bearer ${token}`)
    headers.set("Accept", "application/json")
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
    if (stableRequestId) headers.set("PayPal-Request-Id", requestId(stableRequestId, path))
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      if (stableRequestId && attempt === 0) {
        return this.request<T>(path, init, stableRequestId, attempt + 1)
      }
      throw error
    }
    const body = (await response.json().catch(() => ({}))) as T
    if (!response.ok) {
      if (stableRequestId && response.status >= 500 && attempt === 0) {
        return this.request<T>(path, init, stableRequestId, attempt + 1)
      }
      const detail = body && typeof body === "object"
        ? (body as { details?: Array<{ issue?: string; field?: string; description?: string }> }).details?.[0]
        : undefined
      const message = [
        detail?.issue,
        detail?.field ? `field=${detail.field}` : null,
        detail?.description,
      ].filter(Boolean).join(" - ")
      throw Object.assign(new Error(message || `PayPal request failed (${response.status})`), {
        status: response.status,
        paypalIssue: detail?.issue,
        paypalField: detail?.field,
      })
    }
    return body
  }

  createOrder(input: {
    amount: unknown
    currencyCode: string
    referenceId: string
    customId?: string
    brandName?: string
    returnUrl?: string
    cancelUrl?: string
    vaultId?: string
    requestId?: string
  }) {
    const currency = input.currencyCode.toUpperCase()
    // PayPal's PATCH selector addresses a purchase unit by reference_id. Keep
    // it limited to the selector-safe identifier format we generate below.
    const referenceId = input.referenceId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) || "checkout"
    return this.request<PayPalOrder>(
      "/v2/checkout/orders",
      {
        method: "POST",
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: referenceId,
            ...(input.customId ? { custom_id: input.customId } : {}),
            amount: { currency_code: currency, value: decimalAmount(input.amount, currency) },
          }],
          payment_source: input.vaultId
            ? { paypal: { vault_id: input.vaultId } }
            : {
                paypal: {
                  experience_context: {
                    brand_name: input.brandName || "CiiVerse",
                    ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
                    ...(input.cancelUrl ? { cancel_url: input.cancelUrl } : {}),
                    user_action: "PAY_NOW",
                    shipping_preference: "NO_SHIPPING",
                  },
                },
              },
        }),
      },
      input.requestId
    )
  }

  retrieveOrder(orderId: string) {
    return this.request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`)
  }

  updateOrder(orderId: string, input: {
    amount?: unknown
    currencyCode?: string
    customId?: string
    customIdExists?: boolean
    referenceId?: string
    requestId?: string
  }) {
    const operations: Array<Record<string, unknown>> = []
    const referenceId = (input.referenceId || "checkout").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) || "checkout"
    // The Orders API does not support array-index JSON pointers here. Its
    // documented purchase-unit selector is based on reference_id.
    const purchaseUnitPath = `/purchase_units/@reference_id=='${referenceId}'`
    if (input.amount !== undefined && input.currencyCode) {
      operations.push({ op: "replace", path: `${purchaseUnitPath}/amount`, value: { currency_code: input.currencyCode.toUpperCase(), value: decimalAmount(input.amount, input.currencyCode) } })
    }
    if (input.customId) {
      operations.push({
        op: input.customIdExists ? "replace" : "add",
        path: `${purchaseUnitPath}/custom_id`,
        value: input.customId,
      })
    }
    if (!operations.length) return this.retrieveOrder(orderId)
    return this.request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      body: JSON.stringify(operations),
      headers: { "Content-Type": "application/json" },
    }, input.requestId)
  }

  captureOrder(orderId: string, stableRequestId?: string) {
    return this.request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }, stableRequestId)
  }

  refundCapture(captureId: string, input: { amount?: unknown; currencyCode?: string; requestId?: string }) {
    const body = input.amount === undefined || !input.currencyCode
      ? undefined
      : JSON.stringify({ amount: { currency_code: input.currencyCode.toUpperCase(), value: decimalAmount(input.amount, input.currencyCode) } })
    return this.request<PayPalRefund>(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
      method: "POST",
      ...(body ? { body } : {}),
      headers: { "Content-Type": "application/json" },
    }, input.requestId)
  }

  createVaultSetupToken(input: { returnUrl: string; cancelUrl: string; requestId?: string }) {
    return this.request<PayPalVaultSetupToken>(
      "/v3/vault/setup-tokens",
      {
        method: "POST",
        body: JSON.stringify({
          payment_source: {
            paypal: {
              usage_type: "MERCHANT",
              usage_pattern: "IMMEDIATE",
              customer_type: "CONSUMER",
              experience_context: {
                brand_name: this.options.brandName || "CiiVerse",
                return_url: input.returnUrl,
                cancel_url: input.cancelUrl,
              },
            },
          },
        }),
      },
      input.requestId
    )
  }

  async createVaultUserIdToken(input: { targetCustomerId: string }) {
    const encoded = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString("base64")
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      response_type: "id_token",
      target_customer_id: input.targetCustomerId,
    })
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const payload = (await response.json().catch(() => ({}))) as PayPalUserIdToken & {
      details?: Array<{ issue?: string; field?: string; description?: string }>
    }
    if (!response.ok || !payload.id_token) {
      const detail = payload.details?.[0]
      const payloadKeys = Object.keys(payload).filter((key) => !/token/i.test(key))
      const message = [
        detail?.issue,
        detail?.field ? `field=${detail.field}` : null,
        detail?.description,
        response.ok && !payload.id_token ? `keys=${payloadKeys.join(",") || "none"}` : null,
      ].filter(Boolean).join(" - ")
      throw Object.assign(new Error(message || `PayPal user id token request failed (${response.status})`), {
        status: response.status,
        paypalIssue: detail?.issue,
        paypalField: detail?.field,
      })
    }
    return payload
  }

  getMerchantId() {
    return this.options.merchantId
  }

  createVaultPaymentToken(setupTokenId: string, requestId?: string) {
    return this.request<PayPalVaultPaymentToken>(
      "/v3/vault/payment-tokens",
      {
        method: "POST",
        body: JSON.stringify({
          payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } },
        }),
      },
      requestId
    )
  }

  deleteVaultPaymentToken(vaultId: string, requestId?: string) {
    return this.request<void>(
      `/v3/vault/payment-tokens/${encodeURIComponent(vaultId)}`,
      { method: "DELETE" },
      requestId
    )
  }

  async verifyWebhook(input: { rawData: string | Buffer; headers: Record<string, unknown> }) {
    if (!this.options.webhookId) throw new Error("PayPal webhook verification is not configured")
    const raw = rawString(input.rawData)
    let webhookEvent: PayPalWebhookEvent
    try {
      webhookEvent = JSON.parse(raw) as PayPalWebhookEvent
    } catch {
      throw new Error("PayPal webhook body is invalid")
    }
    const verification = await this.request<{ verification_status?: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: headerValue(input.headers, "PAYPAL-AUTH-ALGO"),
          cert_url: headerValue(input.headers, "PAYPAL-CERT-URL"),
          transmission_id: headerValue(input.headers, "PAYPAL-TRANSMISSION-ID"),
          transmission_sig: headerValue(input.headers, "PAYPAL-TRANSMISSION-SIG"),
          transmission_time: headerValue(input.headers, "PAYPAL-TRANSMISSION-TIME"),
          webhook_id: this.options.webhookId,
          webhook_event: webhookEvent,
        }),
      }
    )
    if (verification.verification_status !== "SUCCESS") throw new Error("PayPal webhook signature verification failed")
    return webhookEvent
  }
}

export const getConfiguredPayPalClient = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim()
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret || process.env.PAYPAL_ENVIRONMENT !== "sandbox") return null
  return new PayPalClient({
    clientId,
    clientSecret,
    environment: "sandbox",
    merchantId: process.env.PAYPAL_MERCHANT_ID?.trim() || undefined,
    webhookId: process.env.PAYPAL_WEBHOOK_ID?.trim() || undefined,
    brandName: process.env.PAYPAL_BRAND_NAME?.trim() || "CiiVerse",
    returnUrl:
      process.env.PAYPAL_RETURN_URL?.trim() ||
      `${process.env.STOREFRONT_URL?.trim() || "http://127.0.0.1:5174"}/checkout?paypal_return=1`,
    cancelUrl:
      process.env.PAYPAL_CANCEL_URL?.trim() ||
      `${process.env.STOREFRONT_URL?.trim() || "http://127.0.0.1:5174"}/checkout?paypal_cancel=1`,
  })
}
