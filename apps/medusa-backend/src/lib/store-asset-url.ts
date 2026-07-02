const MEDUSA_STATIC_PREFIXES = ["/static/logos/", "/static/gallery/", "/static/banners/", "/static/reviews/"]

const AI_WORKER_STATIC_FILE = /^\/static\/(mockup_|design_|print_)/i

export const readAiWorkerPublicBase = () => {
  const explicit = process.env.AI_WORKER_PUBLIC_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, "")

  const base = (process.env.AI_WORKER_BASE_URL ?? "http://127.0.0.1:8001").replace(/\/+$/, "")
  return `${base}/static`
}

const rewriteHost = (url: URL, targetBase: string) => {
  const target = new URL(`${targetBase.replace(/\/+$/, "")}/`)
  url.protocol = target.protocol
  url.host = target.host
  return url.toString()
}

export const resolveStoreAssetUrl = (url: string | null | undefined): string | null => {
  if (!url?.trim()) return null

  const trimmed = url.trim()
  const medusaBase = (
    process.env.MEDUSA_PUBLIC_URL ??
    process.env.MEDUSA_BACKEND_URL ??
    "http://127.0.0.1:9000"
  ).replace(/\/+$/, "")

  if (!/^https?:\/\//i.test(trimmed)) {
    if (trimmed.startsWith("/static/") && AI_WORKER_STATIC_FILE.test(trimmed)) {
      const filename = trimmed.replace(/^\/static\//, "")
      return `${readAiWorkerPublicBase()}/${filename}`
    }
    return trimmed.startsWith("/") ? `${medusaBase}${trimmed}` : `${medusaBase}/${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    const pathname = parsed.pathname

    if (AI_WORKER_STATIC_FILE.test(pathname)) {
      const filename = pathname.replace(/^\/static\//, "")
      return `${readAiWorkerPublicBase()}/${filename}`
    }

    if (MEDUSA_STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return rewriteHost(parsed, medusaBase)
    }

    if (pathname.startsWith("/static/")) {
      const aiWorker = new URL(`${readAiWorkerPublicBase()}/`)
      if (parsed.port === aiWorker.port) {
        return rewriteHost(parsed, readAiWorkerPublicBase())
      }
      return rewriteHost(parsed, medusaBase)
    }
  } catch {
    return trimmed
  }

  return trimmed
}
