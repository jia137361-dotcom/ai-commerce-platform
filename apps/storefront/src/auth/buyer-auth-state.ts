import { clearBuyerAiDesignClientState } from "../lib/buyer-design-handoff"
import { clearBuyerDesignClientState } from "../lib/buyer-my-designs"

const LEGACY_BUYER_AUTH_KEYS = [
  "buyer_auth_token",
  "buyer_customer",
  "citigoo:buyer_auth_token",
  "citigoo:buyer_customer",
] as const

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

export const clearBuyerAuthClientState = (
  localStorage?: StorageLike,
  sessionStorage?: StorageLike
) => {
  for (const key of LEGACY_BUYER_AUTH_KEYS) {
    localStorage?.removeItem(key)
    sessionStorage?.removeItem(key)
  }
  // Personal design drafts must not survive logout on a shared browser.
  if (localStorage) {
    clearBuyerDesignClientState(localStorage)
  } else if (typeof window !== "undefined") {
    clearBuyerDesignClientState(window.localStorage)
  }
  clearBuyerAiDesignClientState()
}
