const LEGACY_BUYER_AUTH_KEYS = [
  "buyer_auth_token",
  "buyer_customer",
  "citigoo:buyer_auth_token",
  "citigoo:buyer_customer",
] as const

type StorageLike = Pick<Storage, "removeItem">

export const clearBuyerAuthClientState = (
  localStorage?: StorageLike,
  sessionStorage?: StorageLike
) => {
  for (const key of LEGACY_BUYER_AUTH_KEYS) {
    localStorage?.removeItem(key)
    sessionStorage?.removeItem(key)
  }
}
