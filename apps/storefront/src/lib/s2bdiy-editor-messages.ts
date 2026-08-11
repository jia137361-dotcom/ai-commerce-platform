/**
 * Parse / detect S2BDIY editor save postMessages.
 * SDK historically sends objects; some builds stringified JSON or nest payloads.
 */

const S2BDIY_HOST_RE = /(^|\.)s2bdiy\.com$/i

export const isS2bdiyOrigin = (origin: string) => {
  try {
    const host = new URL(origin).hostname
    return S2BDIY_HOST_RE.test(host)
  } catch {
    return false
  }
}

const readImageUrl = (value: unknown): string | null => {
  if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) return value.trim()
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>
    for (const key of ["url", "image_url", "imageUrl", "src"]) {
      const nested = row[key]
      if (typeof nested === "string" && /^https?:\/\//i.test(nested.trim())) return nested.trim()
    }
  }
  return null
}

export const extractMockupUrlsFromMessage = (data: Record<string, unknown>): string[] => {
  const urls: string[] = []
  const push = (value: unknown) => {
    const url = readImageUrl(value)
    if (url && !urls.includes(url)) urls.push(url)
  }

  const walk = (node: unknown, depth: number) => {
    if (depth > 6 || node == null) return
    push(node)
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1))
      return
    }
    if (typeof node !== "object") return
    const row = node as Record<string, unknown>
    for (const key of [
      "mockup_url",
      "mockupUrl",
      "preview_url",
      "previewUrl",
      "image",
      "image_url",
      "mockup_urls",
      "mockupUrls",
      "show_images",
      "showImages",
      "images",
    ]) {
      if (key in row) walk(row[key], depth + 1)
    }
  }

  walk(data, 0)
  return urls
}

export const parseS2bdiyMessageData = (raw: unknown): Record<string, unknown> | null => {
  let current: unknown = raw
  if (typeof current === "string") {
    const trimmed = current.trim()
    if (!trimmed) return null
    try {
      current = JSON.parse(trimmed)
    } catch {
      return null
    }
  }
  if (!current || typeof current !== "object") return null
  return current as Record<string, unknown>
}

const coerceProductId = (raw: unknown): number | null => {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.trunc(raw)
  if (typeof raw === "string" && /^\d{3,}$/.test(raw.trim())) return Number(raw.trim())
  return null
}

/** Recursively find an S2B designed product id in arbitrary postMessage payloads. */
export const resolveSavedProductId = (data: unknown, depth = 0): number | null => {
  if (depth > 7 || data == null) return null
  const direct = coerceProductId(data)
  if (direct) return direct
  if (typeof data !== "object") return null

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = resolveSavedProductId(item, depth + 1)
      if (found) return found
    }
    return null
  }

  const row = data as Record<string, unknown>
  for (const key of [
    "product_id",
    "productId",
    "ProductId",
    "s2b_product_id",
    "s2bProductId",
    "designed_product_id",
    "designedProductId",
  ]) {
    const found = coerceProductId(row[key])
    if (found) return found
  }

  // Prefer nested product objects before scanning everything.
  for (const key of ["product", "data", "payload", "message", "detail", "result", "body"]) {
    if (key in row) {
      const found = resolveSavedProductId(row[key], depth + 1)
      if (found) return found
    }
  }

  for (const [key, value] of Object.entries(row)) {
    if (key === "id" || key === "basic_product_id" || key === "basicProductId") continue
    if (value && typeof value === "object") {
      const found = resolveSavedProductId(value, depth + 1)
      if (found) return found
    }
  }

  // Last resort: bare `id` when clearly a product save envelope.
  const type = typeof row.type === "string" ? row.type.toLowerCase() : ""
  if (type.includes("product") || type.includes("save")) {
    return coerceProductId(row.id)
  }
  return null
}

export const isIgnorableEditorMessage = (data: Record<string, unknown>) => {
  const type = typeof data.type === "string" ? data.type.toLowerCase() : ""
  return (
    type === "s2bdiy:ready" ||
    type === "ready" ||
    type.includes("resize") ||
    type.includes("height") ||
    type.includes("scroll") ||
    type.includes("ping") ||
    type.includes("heartbeat")
  )
}

/** Any message that yields a designed product id should persist to My Design (one-step). */
export const shouldAutoPersistDesign = (data: Record<string, unknown>) => {
  if (isIgnorableEditorMessage(data)) return false
  return resolveSavedProductId(data) != null
}
