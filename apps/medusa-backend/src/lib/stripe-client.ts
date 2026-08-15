type StripeRequestParams = Record<string, unknown>

export const isStripeConfigured = () =>
  typeof process.env.STRIPE_API_KEY === "string" && process.env.STRIPE_API_KEY.startsWith("sk_")

const encodeStripeParams = (params: StripeRequestParams, prefix = ""): URLSearchParams => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    const encodedKey = prefix ? `${prefix}[${key}]` : key
    if (typeof value === "object" && !Array.isArray(value)) {
      const nested = encodeStripeParams(value as StripeRequestParams, encodedKey)
      nested.forEach((nestedValue, nestedKey) => search.append(nestedKey, nestedValue))
      continue
    }
    search.append(encodedKey, String(value))
  }
  return search
}

export async function stripeApiRequest<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "DELETE"
    params?: StripeRequestParams
    idempotencyKey?: string
  } = {}
): Promise<T> {
  const apiKey = process.env.STRIPE_API_KEY
  if (!apiKey?.startsWith("sk_")) {
    throw new Error("STRIPE_API_KEY is not configured")
  }

  const method = init.method ?? "GET"
  const body = init.params && method !== "GET" ? encodeStripeParams(init.params).toString() : undefined
  const url =
    method === "GET" && init.params
      ? `https://api.stripe.com/v1${path}?${encodeStripeParams(init.params).toString()}`
      : `https://api.stripe.com/v1${path}`

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  })

  const payload = (await response.json()) as T & { error?: { message?: string; code?: string; type?: string } }
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message || `Stripe request failed (${response.status})`), {
      status: response.status,
      stripeCode: payload.error?.code,
      stripeType: payload.error?.type,
    })
  }
  return payload
}

export const isStripeResourceNotFoundError = (error: unknown) => {
  const candidate = error as { status?: unknown; stripeCode?: unknown } | null
  return (
    candidate?.status === 404 ||
    candidate?.stripeCode === "resource_missing" ||
    // Stripe uses account_invalid when a Connect account was deleted or this
    // platform's access to it was revoked. Both require re-onboarding.
    candidate?.stripeCode === "account_invalid"
  )
}
