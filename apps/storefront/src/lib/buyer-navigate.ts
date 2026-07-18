/** Client-side path change for the storefront app-shell (no react-router). */
export const BUYER_NAVIGATE_EVENT = "citigoo:buyer-navigate"

export type BuyerNavigateDetail = {
  pathname: string
  search: string
  hash: string
}

export const navigateBuyer = (to: string, options?: { replace?: boolean }) => {
  const url = new URL(to, window.location.origin)
  const next = `${url.pathname}${url.search}${url.hash}`
  if (options?.replace) {
    window.history.replaceState({}, "", next)
  } else {
    window.history.pushState({}, "", next)
  }
  window.dispatchEvent(
    new CustomEvent<BuyerNavigateDetail>(BUYER_NAVIGATE_EVENT, {
      detail: {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      },
    })
  )
}

/** Same-origin in-app links should use SPA navigation instead of full reloads. */
export const isBuyerInAppHref = (href: string | null | undefined) => {
  if (!href) return false
  if (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//")
  ) {
    return false
  }
  // Pure hash jumps stay on the current document unless path differs.
  return true
}
