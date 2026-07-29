import type { S2bdiyConfig } from "./config"
import { getS2bdiyAccessToken, clearS2bdiyTokenCache } from "./s2bdiy-auth"

// ---- Error ----

export class S2bDiyError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message)
    this.name = "S2bDiyError"
  }
}
export { S2bDiyError as S2bdiyApiError }

// ---- Request options ----

export type S2bdiyRequestOptions = {
  method?: string
  query?: Record<string, string | number | undefined>
  body?: unknown
  formData?: FormData
  skipAuth?: boolean
  /** Abort the upstream call after this many ms (default: no timeout). */
  timeoutMs?: number
}

// ---- S2bdiyClient class ----

export class S2bdiyClient {
  constructor(private readonly config: S2bdiyConfig) {}

  async request<T = Record<string, unknown>>(path: string, options: S2bdiyRequestOptions = {}): Promise<T> {
    const attempt = async (retryOn401: boolean): Promise<T> => {
      const url = new URL(path.startsWith("http") ? path : `${this.config.apiBaseUrl}${path}`)
      if (options.query) {
        for (const [k, v] of Object.entries(options.query)) {
          if (v !== undefined && v !== "") url.searchParams.set(k, String(v))
        }
      }

      const headers: Record<string, string> = { Accept: "application/json" }
      if (!options.skipAuth) {
        headers.Authorization = `Bearer ${await getS2bdiyAccessToken(this.config)}`
      }

      let body: BodyInit | undefined
      if (options.formData) {
        body = options.formData
      } else if (options.body !== undefined) {
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(options.body)
      }

      const timeoutMs =
        typeof options.timeoutMs === "number" && options.timeoutMs > 0
          ? options.timeoutMs
          : undefined
      const controller = timeoutMs ? new AbortController() : null
      const timer = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null

      let res: Response
      try {
        res = await fetch(url.toString(), {
          method: options.method ?? (options.body || options.formData ? "POST" : "GET"),
          headers,
          body,
          signal: controller?.signal,
        })
      } catch (error) {
        if (controller?.signal.aborted) {
          throw new S2bDiyError(
            `S2BDIY ${options.method ?? "GET"} ${path} timed out after ${timeoutMs}ms`,
            408,
            { timeout_ms: timeoutMs }
          )
        }
        throw error
      } finally {
        if (timer) clearTimeout(timer)
      }

      if (res.status === 401 && retryOn401 && !options.skipAuth) {
        clearS2bdiyTokenCache()
        return attempt(false)
      }

      const text = await res.text()
      let parsed: unknown = {}
      try { parsed = text ? JSON.parse(text) : {} } catch { parsed = { raw: text } }

      if (!res.ok) {
        throw new S2bDiyError(
          `S2BDIY ${options.method ?? "GET"} ${path} failed HTTP ${res.status}`, res.status, parsed
        )
      }

      const envelope = parsed as Record<string, unknown>
      if (envelope.status_code !== undefined && Number(envelope.status_code) !== 200) {
        throw new S2bDiyError(
          `S2BDIY ${options.method ?? "GET"} ${path} failed: ${String(envelope.msg ?? "business error")}`,
          Number(envelope.status_code) || 400,
          parsed
        )
      }
      return (envelope.data !== undefined ? envelope.data : parsed) as T
    }
    return attempt(true)
  }
}

export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    for (const key of ["data", "list", "items", "records"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[]
    }
  }
  return []
}

// ---- Standalone functions (backward compat) ----

async function getToken(): Promise<string> {
  const apiBaseUrl = (process.env.S2BDIY_BASE_URL || process.env.S2BDIY_API_BASE_URL)?.replace(/\/$/, "")
  const appKey = process.env.S2BDIY_APP_KEY
  const appSecret = process.env.S2BDIY_APP_SECRET
  if (!apiBaseUrl || !appKey || !appSecret) {
    throw new Error("S2BDIY credentials not configured. Set S2BDIY_BASE_URL or S2BDIY_API_BASE_URL, S2BDIY_APP_KEY, and S2BDIY_APP_SECRET.")
  }
  return getS2bdiyAccessToken({ apiBaseUrl, appKey, appSecret, platformId: Number(process.env.S2BDIY_PLATFORM_ID || "99") })
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken()
  const baseUrl = (process.env.S2BDIY_BASE_URL || process.env.S2BDIY_API_BASE_URL)?.replace(/\/$/, "")
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  let fetchBody: BodyInit | undefined
  if (body instanceof FormData) {
    fetchBody = body
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    fetchBody = JSON.stringify(body)
  }
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: fetchBody })
  if (!res.ok) {
    const text = await res.text()
    throw new S2bDiyError(`S2BDIY ${method} ${path} failed: ${res.status}`, res.status, text)
  }
  return res.json() as Promise<T>
}

export function s2bGet<T>(path: string): Promise<T> { return request<T>("GET", path) }
export function s2bPost<T>(path: string, body?: unknown): Promise<T> { return request<T>("POST", path, body) }
