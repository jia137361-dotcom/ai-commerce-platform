export type SupplierProductGalleryItem = {
  id: string
  label: string
  url: string
  kind: "mockup"
}

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

const readObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const readImageUrl = (value: unknown): string | null => {
  const direct = readString(value)
  if (direct) return direct
  const row = readObject(value)
  if (!row) return null
  return readString(row.big_src) ?? readString(row.src) ?? readString(row.url)
}

const normalizeColorId = (value: unknown): string | null => {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

const readImageBlocks = (raw: Record<string, unknown>): Array<Record<string, unknown>> => {
  const candidates = [raw.product_show_images, raw.show_images]
  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.flatMap((item) => {
        const row = readObject(item)
        return row ? [row] : []
      })
    }
  }
  return []
}

export function buildSupplierProductColorImageMap(rawJson: unknown): Map<string, string> {
  const raw = readObject(rawJson)
  const map = new Map<string, string>()
  if (!raw) return map

  for (const block of readImageBlocks(raw)) {
    const colorId = normalizeColorId(block.color_id)
    const images = Array.isArray(block.images) ? block.images : []
    const imageUrl = images.map(readImageUrl).find(Boolean) ?? readImageUrl(block)
    if (colorId && imageUrl && !map.has(colorId)) {
      map.set(colorId, imageUrl)
    }
  }

  return map
}

export function buildSupplierProductGallery(
  rawJson: unknown,
  fallbackImageUrl?: unknown
): SupplierProductGalleryItem[] {
  const raw = readObject(rawJson)
  const seen = new Set<string>()
  const gallery: SupplierProductGalleryItem[] = []

  const push = (url: string | null, label?: string | null) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    const index = gallery.length
    gallery.push({
      id: index === 0 ? "mockup_front" : `mockup_${index + 1}`,
      label: label || (index === 0 ? "Front" : `View ${index + 1}`),
      url,
      kind: "mockup",
    })
  }

  if (raw) {
    for (const block of readImageBlocks(raw)) {
      const colorName = readString(block.color_name) ?? readString(block.name)
      const images = Array.isArray(block.images) ? block.images : []
      if (images.length) {
        images.forEach((image, index) => {
          push(readImageUrl(image), images.length > 1 && colorName ? `${colorName} ${index + 1}` : colorName)
        })
      } else {
        push(readImageUrl(block), colorName)
      }
    }
  }

  push(readImageUrl(fallbackImageUrl), "Front")

  return gallery
}
