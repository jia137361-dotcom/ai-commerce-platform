export const buildProductSignInHref = (returnTo: string) => {
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("://")
    ? returnTo
    : "/store"
  return `/account/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}`
}
