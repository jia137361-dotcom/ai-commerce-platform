const MEDUSA_STATIC_PREFIXES = ["/static/logos/", "/static/gallery/", "/static/banners/", "/static/reviews/"]

const AI_WORKER_STATIC_FILE = /^\/static\/(mockup_|design_|print_)/i

const rewriteHost = (url: URL, targetBase: string) => {
  const target = new URL(`${targetBase.replace(/\/+$/, "")}/`)
  url.protocol = target.protocol
  url.host = target.host
  return url.toString()
}

export function resolveStoreAssetUrl(
  url: string | undefined,
  backendBase: string,
  aiWorkerPublicBase = "http://127.0.0.1:8001/static"
): string | undefined {
  if (!url?.trim()) {
    return undefined
  }

  const trimmed = url.trim()
  const medusaBase = backendBase.replace(/\/+$/, "")
  const aiWorkerBase = aiWorkerPublicBase.replace(/\/+$/, "")

  if (!/^https?:\/\//i.test(trimmed)) {
    if (trimmed.startsWith("/static/") && AI_WORKER_STATIC_FILE.test(trimmed)) {
      const filename = trimmed.replace(/^\/static\//, "")
      return `${aiWorkerBase}/${filename}`
    }
    return trimmed.startsWith("/") ? `${medusaBase}${trimmed}` : `${medusaBase}/${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    const pathname = parsed.pathname

    if (AI_WORKER_STATIC_FILE.test(pathname)) {
      const filename = pathname.replace(/^\/static\//, "")
      return `${aiWorkerBase}/${filename}`
    }

    if (MEDUSA_STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return rewriteHost(parsed, medusaBase)
    }

    if (pathname.startsWith("/static/")) {
      const aiWorker = new URL(`${aiWorkerBase}/`)
      if (parsed.port === aiWorker.port) {
        return rewriteHost(parsed, aiWorkerBase)
      }
      return rewriteHost(parsed, medusaBase)
    }
  } catch {
    return trimmed
  }

  return trimmed
}
