import { clearSellerStoreId, getSellerStoreId, setSellerStoreId } from "./seller-store-id"

const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL ?? "http://127.0.0.1:9000"
export const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL ?? "http://127.0.0.1:5174"

export type SellerSession = {
  user_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  store_id: string | null
  store_name: string | null
}

export type SellerRegisterInput = {
  email: string
  password: string
  storeName?: string
  firstName?: string
  lastName?: string
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
  headers.set("X-Store-Id", getSellerStoreId())
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${MEDUSA_URL}${path}`, { ...init, headers })

  if (response.status === 401) {
    setToken(null)
    clearSellerStoreId()
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

const readNetworkError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Unable to reach the seller backend. Check that medusa-backend is running and restart it after updates."
  }
  return message
}

export async function fetchSellerSession() {
  const payload = await apiFetch<{ session: SellerSession }>("/seller/session")
  if (payload.session.store_id) {
    setSellerStoreId(payload.session.store_id)
  }
  return payload.session
}

export async function login(email: string, password: string) {
  let response: Response
  try {
    response = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  } catch (error: unknown) {
    throw new ApiError(0, "NETWORK_ERROR", readNetworkError(error))
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, "AUTH_FAILED", body?.message ?? "Login failed")
  }
  const token = body.token as string
  setToken(token)
  try {
    await fetchSellerSession()
  } catch (error: unknown) {
    setToken(null)
    clearSellerStoreId()
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403 || error.status === 404 || error.code === "STORE_NOT_FOUND")
    ) {
      throw new ApiError(error.status, "SELLER_STORE_NOT_LINKED", "This account is not linked to a seller store.")
    }
    throw error
  }
  return token
}

export async function registerSeller(input: SellerRegisterInput) {
  let response: Response
  try {
    response = await fetch(`${MEDUSA_URL}/seller/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email.trim(),
        password: input.password,
        store_name: input.storeName?.trim() || undefined,
        first_name: input.firstName?.trim() || undefined,
        last_name: input.lastName?.trim() || undefined,
      }),
    })
  } catch (error: unknown) {
    throw new ApiError(0, "NETWORK_ERROR", readNetworkError(error))
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "REGISTER_FAILED",
      body?.error?.message ?? body?.message ?? "Registration failed"
    )
  }

  const seller = body?.seller as { token?: string; store_id?: string; email?: string }
  if (!seller?.token || !seller.store_id) {
    throw new ApiError(response.status, "REGISTER_FAILED", "Registration succeeded without a seller session")
  }

  setToken(seller.token)
  setSellerStoreId(seller.store_id)
  return seller
}

export { MEDUSA_URL, getSellerStoreId as STORE_ID }
