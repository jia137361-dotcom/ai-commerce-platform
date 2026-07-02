const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL ?? "http://localhost:9000"
const STORE_ID = import.meta.env.VITE_STORE_ID ?? "default_store"
export const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL ?? "http://127.0.0.1:5174"

export class ApiError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const getToken = () => localStorage.getItem("seller_admin_token")

export const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem("seller_admin_token", token)
  } else {
    localStorage.removeItem("seller_admin_token")
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "application/json")
  headers.set("X-Store-Id", STORE_ID)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${MEDUSA_URL}${path}`, { ...init, headers })

  if (response.status === 401) {
    setToken(null)
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login")
    }
    throw new ApiError(401, "UNAUTHORIZED", "Session expired")
  }

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const err = body?.error
    throw new ApiError(
      response.status,
      err?.code ?? "REQUEST_FAILED",
      err?.message ?? response.statusText
    )
  }

  return body as T
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
  const token = body.token as string
  setToken(token)
  return token
}

export { MEDUSA_URL, STORE_ID }
