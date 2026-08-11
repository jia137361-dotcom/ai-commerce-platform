import type { NormalizedProduct } from "@ai-commerce/shared-types"
import { resolveStoreAssetUrl } from "./store-media-url"

const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL ?? "http://localhost:9000"
const AI_WORKER_PUBLIC_BASE =
  import.meta.env.VITE_AI_WORKER_PUBLIC_BASE_URL ?? "http://127.0.0.1:8001/static"

export type ProductGalleryItem = {
  id: string
  label: string
  url: string
  kind: "mockup" | "design" | "print_file"
}

export const withCacheBust = (url: string, cacheKey?: string | null) => {
  if (!url || !cacheKey) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}v=${encodeURIComponent(cacheKey)}`
}

const isGalleryItem = (value: unknown): value is ProductGalleryItem => {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === "string" &&
    typeof row.label === "string" &&
    typeof row.url === "string" &&
    typeof row.kind === "string" &&
    ["mockup", "design", "print_file"].includes(row.kind)
  )
}

const parseGallery = (value: unknown): ProductGalleryItem[] => {
  if (!Array.isArray(value)) return []
  return value.filter(isGalleryItem)
}

const legacyGallery = (
  product?: Partial<NormalizedProduct> | null,
  generation?: Record<string, unknown> | null
): ProductGalleryItem[] => {
  const designUrl =
    (typeof generation?.design_image_url === "string" ? generation.design_image_url : undefined) ||
    product?.design_image_url ||
    (product?.metadata?.design_image_url as string | undefined)
  const printUrl =
    (typeof generation?.print_file_url === "string" ? generation.print_file_url : undefined) ||
    (product?.metadata?.print_file_url as string | undefined)
  const mockupFront =
    (typeof generation?.mockup_image_url === "string" ? generation.mockup_image_url : undefined) ||
    product?.mockup_image_url ||
    (product?.metadata?.mockup_image_url as string | undefined) ||
    product?.image_url

  const items: ProductGalleryItem[] = []
  if (designUrl) {
    items.push({ id: "design", label: "Print Artwork", url: designUrl, kind: "design" })
  }
  if (printUrl) {
    items.push({ id: "print_file", label: "Print File", url: printUrl, kind: "print_file" })
  }
  if (mockupFront) {
    items.push({ id: "mockup_front", label: "Front", url: mockupFront, kind: "mockup" })
  }
  return items
}

export const buildProductGallery = (
  product?: Partial<NormalizedProduct> | null,
  generation?: Record<string, unknown> | null,
  options?: { cacheKey?: string | null; preferProduct?: boolean }
) => {
  const cacheKey = options?.cacheKey ?? product?.ai_job_id ?? null
  const fromMeta = parseGallery(product?.metadata?.gallery)
  const fromGeneration = parseGallery(generation?.gallery)
  const preferProduct = options?.preferProduct ?? false
  const gallery =
    preferProduct && fromMeta.length > 0
      ? fromMeta
      : fromGeneration.length > 0
        ? fromGeneration
        : fromMeta.length > 0
          ? fromMeta
          : legacyGallery(product, generation)

  const unique = new Map<string, ProductGalleryItem>()
  for (const item of gallery) {
    if (!item.url) continue
    const resolvedUrl = resolveStoreAssetUrl(item.url, MEDUSA_URL, AI_WORKER_PUBLIC_BASE) ?? item.url
    const cachedItem = { ...item, url: withCacheBust(resolvedUrl, cacheKey) }
    const existing = unique.get(item.id)
    if (!existing) {
      unique.set(item.id, cachedItem)
      continue
    }
    if (existing.url !== cachedItem.url) {
      unique.set(item.id, cachedItem)
    }
  }

  const all = [...unique.values()].sort((a, b) => {
    const rank = (item: ProductGalleryItem) => {
      if (item.kind === "mockup") return 0
      if (item.kind === "design") return 1
      return 2
    }
    const diff = rank(a) - rank(b)
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id)
  })
  const mockups = all.filter((item) => item.kind === "mockup")
  const dedupedMockups: ProductGalleryItem[] = []
  const seenMockupUrls = new Set<string>()
  for (const item of mockups) {
    if (seenMockupUrls.has(item.url)) continue
    seenMockupUrls.add(item.url)
    dedupedMockups.push(item)
  }

  return {
    all,
    mockups: dedupedMockups,
    diyAssets: all.filter((item) => item.kind === "design" || item.kind === "print_file"),
  }
}
