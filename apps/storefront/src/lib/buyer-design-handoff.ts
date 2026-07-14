/** Persist buyer AI designs + Studio handoff across pages (local-only MVP). */

const LIBRARY_KEY = "citigoo:buyer-ai-designs"
const PENDING_MATERIAL_KEY = "citigoo:pending-studio-material"
const MAX_DESIGNS = 24

export type BuyerSavedDesign = {
  id: string
  createdAt: string
  productId?: string
  materialId?: string | null
  designImageUrl?: string | null
  mockupImageUrl?: string | null
  title?: string | null
  prompt?: string | null
}

export type PendingStudioMaterial = {
  materialId: string
  designImageUrl?: string | null
  title?: string | null
  prompt?: string | null
}

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const listBuyerSavedDesigns = (): BuyerSavedDesign[] => {
  if (typeof window === "undefined") return []
  const items = readJson<BuyerSavedDesign[]>(LIBRARY_KEY, [])
  return Array.isArray(items) ? items : []
}

export const clearBuyerAiDesignClientState = () => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(LIBRARY_KEY)
  window.sessionStorage.removeItem(PENDING_MATERIAL_KEY)
}

export const saveBuyerDesign = (design: Omit<BuyerSavedDesign, "id" | "createdAt"> & { id?: string }) => {
  if (typeof window === "undefined") return
  const next: BuyerSavedDesign = {
    id: design.id || `design_${Date.now()}`,
    createdAt: new Date().toISOString(),
    productId: design.productId,
    materialId: design.materialId,
    designImageUrl: design.designImageUrl,
    mockupImageUrl: design.mockupImageUrl,
    title: design.title,
    prompt: design.prompt,
  }
  const existing = listBuyerSavedDesigns().filter((item) => item.id !== next.id)
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify([next, ...existing].slice(0, MAX_DESIGNS)))
  return next
}

export const setPendingStudioMaterial = (material: PendingStudioMaterial | null) => {
  if (typeof window === "undefined") return
  if (!material) {
    window.sessionStorage.removeItem(PENDING_MATERIAL_KEY)
    return
  }
  window.sessionStorage.setItem(PENDING_MATERIAL_KEY, JSON.stringify(material))
}

export const peekPendingStudioMaterial = (): PendingStudioMaterial | null => {
  if (typeof window === "undefined") return null
  return readJson<PendingStudioMaterial | null>(PENDING_MATERIAL_KEY, null)
}

export const takePendingStudioMaterial = (): PendingStudioMaterial | null => {
  const pending = peekPendingStudioMaterial()
  setPendingStudioMaterial(null)
  return pending
}

export const buildStudioEditorHref = (productId: string, materialId?: string | null) => {
  const base = `/design/${encodeURIComponent(productId)}`
  if (!materialId) return base
  return `${base}?materialId=${encodeURIComponent(materialId)}`
}

export const buildAiDesignHref = (options?: { productId?: string | null; returnTo?: string | null }) => {
  const params = new URLSearchParams()
  if (options?.productId) params.set("productId", options.productId)
  if (options?.returnTo) params.set("returnTo", options.returnTo)
  const query = params.toString()
  return query ? `/ai-design?${query}` : "/ai-design"
}
