export type BrowseUrlState = {
  q?: string
  category?: string
  sort?: string
}

export function readBrowseUrlState(search = window.location.search): BrowseUrlState {
  const params = new URLSearchParams(search)
  return {
    q: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
    sort: params.get("sort") ?? undefined,
  }
}

export function buildBrowseHref(pathname: string, state: BrowseUrlState): string {
  const params = new URLSearchParams()
  if (state.q?.trim()) params.set("q", state.q.trim())
  if (state.category && state.category !== "all") params.set("category", state.category)
  if (state.sort && state.sort !== "recommended") params.set("sort", state.sort)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function syncBrowseUrlState(pathname: string, state: BrowseUrlState) {
  const next = buildBrowseHref(pathname, state)
  const current = `${window.location.pathname}${window.location.search}`
  if (current !== next) {
    window.history.replaceState(window.history.state, "", next)
  }
}
