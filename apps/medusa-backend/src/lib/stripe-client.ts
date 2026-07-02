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

  const payload = (await response.json()) as T & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe request failed (${response.status})`)
  }
  return payload
}
