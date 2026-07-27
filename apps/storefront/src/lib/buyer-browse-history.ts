const HISTORY_KEY = "citigoo:buyer-browse-history"
const MAX_HISTORY = 8

export type BrowseHistoryItem = {
  id: string
  title: string
  imageUrl?: string
  price?: number
  href: string
}

export function readBrowseHistory(): BrowseHistoryItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as BrowseHistoryItem[]) : []
  } catch {
    return []
  }
}

export function pushBrowseHistory(item: BrowseHistoryItem) {
  if (typeof window === "undefined") return
  const next = [item, ...readBrowseHistory().filter((row) => row.id !== item.id)].slice(0, MAX_HISTORY)
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}
