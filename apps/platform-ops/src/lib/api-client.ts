const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL ?? "http://localhost:9000"
const TOKEN_KEY = "platform_ops_token"
const EMAIL_KEY = "platform_ops_email"

export type PlatformSession = {
  user_id: string
  operator_id: string
  role: "admin" | "viewer"
  email: string | null
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}
export const setOpsEmail = (email: string | null) => {
  if (email) localStorage.setItem(EMAIL_KEY, email)
  else localStorage.removeItem(EMAIL_KEY)
}
export const getOpsEmail = () => localStorage.getItem(EMAIL_KEY)
export const clearPlatformSession = () => {
  setToken(null)
  setOpsEmail(null)
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const response = await fetch(`${MEDUSA_URL}${path}`, { ...init, headers })
  const body = await response.json().catch(() => ({}))

  if (response.status === 401 || (response.status === 403 && path === "/admin/platform/session")) {
    clearPlatformSession()
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login")
    }
    throw new ApiError(
      response.status,
      response.status === 403 ? "PLATFORM_OPERATOR_REQUIRED" : "UNAUTHORIZED",
      response.status === 403 ? "This account is not a platform operator." : "Session expired"
    )
  }

  if (!response.ok) {
    const err = body?.error
    throw new ApiError(response.status, err?.code ?? "REQUEST_FAILED", err?.message ?? response.statusText)
  }

  return body as T
}

export async function fetchPlatformSession() {
  const session = await apiFetch<PlatformSession>("/admin/platform/session")
  setOpsEmail(session.email)
  return session
}

export async function login(email: string, password: string) {
  const response = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, "AUTH_FAILED", body?.message ?? "Login failed")
  }
  setToken(body.token as string)
  setOpsEmail(email)
  try {
    await fetchPlatformSession()
  } catch (error: unknown) {
    clearPlatformSession()
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new ApiError(error.status, "PLATFORM_OPERATOR_REQUIRED", "This account is not a platform operator.")
    }
    throw error
  }
}

export { MEDUSA_URL }
