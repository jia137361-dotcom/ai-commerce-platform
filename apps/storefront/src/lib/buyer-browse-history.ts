const HISTORY_KEY = "citigoo:buyer-browse-history"
const MAX_HISTORY = 8

export type BrowseHistoryItem = {
  id: string
  title: string
  imageUrl?: string
  price?: number
  href: string
}

export type BrowseHistoryScope = {
  customerId?: string | null
  email?: string | null
}

const scopedHistoryKey = (scope?: BrowseHistoryScope) => {
  const identity = scope?.customerId?.trim() || scope?.email?.trim().toLowerCase()
  return identity ? `${HISTORY_KEY}:${encodeURIComponent(identity)}` : `${HISTORY_KEY}:guest`
}

export function readBrowseHistory(scope?: BrowseHistoryScope): BrowseHistoryItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(scopedHistoryKey(scope))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as BrowseHistoryItem[]) : []
  } catch {
    return []
  }
}

export function pushBrowseHistory(item: BrowseHistoryItem, scope?: BrowseHistoryScope) {
  if (typeof window === "undefined") return
  const key = scopedHistoryKey(scope)
  const next = [item, ...readBrowseHistory(scope).filter((row) => row.id !== item.id)].slice(0, MAX_HISTORY)
  window.localStorage.setItem(key, JSON.stringify(next))
}
