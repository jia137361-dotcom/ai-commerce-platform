const followStorageKey = (storeId: string) => `citigoo:${storeId}:following`

export const readGuestFollowState = (storeId: string) =>
  window.localStorage.getItem(followStorageKey(storeId)) === "1"

export const writeGuestFollowState = (storeId: string, following: boolean) => {
  if (following) {
    window.localStorage.setItem(followStorageKey(storeId), "1")
  } else {
    window.localStorage.removeItem(followStorageKey(storeId))
  }
}
