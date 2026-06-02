import { config } from "../config"

type ApiOptions = {
  method?: string
  body?: unknown
  storeId?: string
  adminToken?: string
  publishable?: boolean
  baseUrl?: string
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export const apiFetch = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (options.storeId) headers["X-Store-Id"] = options.storeId
  if (options.publishable) headers["x-publishable-api-key"] = config.publishableApiKey
  if (options.adminToken) headers.Authorization = `Bearer ${options.adminToken}`

  const response = await fetch(`${options.baseUrl ?? config.medusaBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      data?.error?.message ??
      data?.message ??
      data?.error ??
      `Request failed with HTTP ${response.status}`
    throw new ApiError(String(message), response.status, data)
  }

  return data as T
}

export const getText = async (url: string) => {
  const response = await fetch(url)
  return { ok: response.ok, status: response.status, text: await response.text() }
}
