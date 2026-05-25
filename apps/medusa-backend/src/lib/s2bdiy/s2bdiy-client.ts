import type { S2bdiyConfig } from "./config"
import { getS2bdiyAccessToken, clearS2bdiyTokenCache } from "./s2bdiy-auth"

export class S2bdiyApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: unknown
  ) {
    super(message)
    this.name = "S2bdiyApiError"
  }
}

export type S2bdiyRequestOptions = {
  method?: string
  query?: Record<string, string | number | undefined>
  body?: unknown
  formData?: FormData
  skipAuth?: boolean
}

export class S2bdiyClient {
  constructor(private readonly config: S2bdiyConfig) {}

  async request<T = Record<string, unknown>>(
    path: string,
    options: S2bdiyRequestOptions = {}
  ): Promise<T> {
    const attempt = async (retryOn401: boolean): Promise<T> => {
      const url = new URL(path.startsWith("http") ? path : `${this.config.apiBaseUrl}${path}`)
      if (options.query) {
        for (const [k, v] of Object.entries(options.query)) {
          if (v !== undefined && v !== "") {
            url.searchParams.set(k, String(v))
          }
        }
      }

      const headers: Record<string, string> = { Accept: "application/json" }
      if (!options.skipAuth) {
        const token = await getS2bdiyAccessToken(this.config)
        headers.Authorization = `Bearer ${token}`
      }

      let body: BodyInit | undefined
      if (options.formData) {
        body = options.formData
      } else if (options.body !== undefined) {
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(options.body)
      }

      const res = await fetch(url.toString(), {
        method: options.method ?? (options.body || options.formData ? "POST" : "GET"),
        headers,
        body,
      })

      if (res.status === 401 && retryOn401 && !options.skipAuth) {
        clearS2bdiyTokenCache()
        return attempt(false)
      }

      const text = await res.text()
      let parsed: unknown = {}
      try {
        parsed = text ? JSON.parse(text) : {}
      } catch {
        parsed = { raw: text }
      }

      if (!res.ok) {
        throw new S2bdiyApiError(
          `S2BDIY ${options.method ?? "GET"} ${path} failed HTTP ${res.status}`,
          res.status,
          parsed
        )
      }

      const envelope = parsed as Record<string, unknown>
      if (envelope.data !== undefined) {
        return envelope.data as T
      }
      return parsed as T
    }

    return attempt(true)
  }
}

export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[]
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    for (const key of ["data", "list", "items", "records"]) {
      if (Array.isArray(obj[key])) {
        return obj[key] as T[]
      }
    }
  }
  return []
}
