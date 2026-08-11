export const safeReturnTo = (fallback = "/account") => {
  const params = new URLSearchParams(window.location.search)
  const value = params.get("returnTo")
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback
  }
  return value
}
