/** Client helpers for Google OAuth start/callback (storefront only). */

const RETURN_KEY = "citigoo:buyer_google_return_to"
const REMEMBER_KEY = "citigoo:buyer_google_remember_me"

export const BUYER_GOOGLE_CALLBACK_PATH = "/auth/google/callback"

/** Vite injects this via `define` in vite.config.ts; Jest reads process.env.
 *  Avoid `process.env?.VITE_*` optional chaining — Vite `define` only replaces the exact key. */
export const isGoogleAuthUiEnabled = () => {
  const fromDefine = process.env.VITE_GOOGLE_AUTH_ENABLED
  return String(fromDefine ?? "").trim().toLowerCase() === "true"
}

export const resolveBuyerGoogleCallbackUrl = () =>
  `${window.location.origin}${BUYER_GOOGLE_CALLBACK_PATH}`

export const stashBuyerGoogleAuthContext = (input: { returnTo: string; rememberMe: boolean }) => {
  window.sessionStorage.setItem(RETURN_KEY, input.returnTo)
  window.sessionStorage.setItem(REMEMBER_KEY, input.rememberMe ? "1" : "0")
}

export const readBuyerGoogleAuthContext = () => {
  const returnTo = window.sessionStorage.getItem(RETURN_KEY)
  const rememberRaw = window.sessionStorage.getItem(REMEMBER_KEY)
  return {
    returnTo:
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("://")
        ? returnTo
        : "/account",
    rememberMe: rememberRaw !== "0",
  }
}

export const clearBuyerGoogleAuthContext = () => {
  window.sessionStorage.removeItem(RETURN_KEY)
  window.sessionStorage.removeItem(REMEMBER_KEY)
}

export const isSafeBuyerReturnPath = (value: string | null | undefined, fallback = "/account") => {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback
  }
  return value
}

/** Force Google account chooser so a second test user is not silently reused. */
export const withGoogleAccountPickerPrompt = (authUrl: string) => {
  try {
    const url = new URL(authUrl)
    url.searchParams.set("prompt", "select_account")
    return url.toString()
  } catch {
    return authUrl
  }
}

const OAUTH_CALLBACK_LOCK_KEY = "citigoo:buyer_google_callback_lock"

/** Prevent dev StrictMode from exchanging the same OAuth code twice. */
export const acquireGoogleCallbackLock = (code: string) => {
  const key = `${OAUTH_CALLBACK_LOCK_KEY}:${code}`
  if (window.sessionStorage.getItem(key) === "done") {
    return false
  }
  if (window.sessionStorage.getItem(key) === "pending") {
    return false
  }
  window.sessionStorage.setItem(key, "pending")
  return true
}

export const completeGoogleCallbackLock = (code: string) => {
  window.sessionStorage.setItem(`${OAUTH_CALLBACK_LOCK_KEY}:${code}`, "done")
}

export const releaseGoogleCallbackLock = (code: string) => {
  window.sessionStorage.removeItem(`${OAUTH_CALLBACK_LOCK_KEY}:${code}`)
}
