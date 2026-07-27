const HISTORY_KEY = "citigoo:buyer-search-history"
const MAX_HISTORY = 12

export function readSearchHistory(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

export function pushSearchHistory(term: string) {
  if (typeof window === "undefined") return
  const trimmed = term.trim()
  if (!trimmed) return
  const next = [trimmed, ...readSearchHistory().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_HISTORY
  )
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

export function clearSearchHistory() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(HISTORY_KEY)
}
