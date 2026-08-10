export const STORE_IMAGE_ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"])

export type StoreMediaKind = "logo" | "banner" | "gallery" | "review"

export const STORE_MEDIA_MAX_BYTES: Record<StoreMediaKind, number> = {
  logo: 2 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
  gallery: 2 * 1024 * 1024,
  review: 2 * 1024 * 1024,
}

export const STORE_GALLERY_MAX_ITEMS = 12

export type StoreImageValidationResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; message: string }

export const validateStoreImageUpload = (
  kind: StoreMediaKind,
  fileBase64: string,
  contentType: string
): StoreImageValidationResult => {
  if (!fileBase64) {
    return { ok: false, message: "file_base64 is required" }
  }

  if (!STORE_IMAGE_ALLOWED_TYPES.has(contentType)) {
    return { ok: false, message: "content_type must be image/png or image/jpeg" }
  }

  const maxBytes = STORE_MEDIA_MAX_BYTES[kind]
  const buffer = Buffer.from(fileBase64, "base64")
  if (buffer.length === 0 || buffer.length > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024))
    return { ok: false, message: `Image must be between 1 byte and ${maxMb}MB` }
  }

  return { ok: true, buffer }
}

const storeMediaFolder = (kind: StoreMediaKind) => {
  if (kind === "logo") return "logos"
  if (kind === "banner") return "banners"
  if (kind === "gallery") return "gallery"
  return "reviews"
}

export const resolveStoreMediaUploadDir = (kind: StoreMediaKind, cwd: string = process.cwd()): string => {
  return `${cwd}/static/${storeMediaFolder(kind)}`
}

type RequestLike = {
  protocol?: string
  get?: (header: string) => string | string[] | undefined
}

export const resolveStoreMediaBaseUrl = (req?: RequestLike, fallback?: string): string => {
  const host = req?.get?.("host")
  if (typeof host === "string" && host.trim()) {
    const protocol = req?.protocol === "https" ? "https" : "http"
    return `${protocol}://${host}`.replace(/\/$/, "")
  }

  return (
    fallback ||
    process.env.MEDUSA_BACKEND_URL ||
    process.env.MEDUSA_BASE_URL ||
    "http://127.0.0.1:9001"
  ).replace(/\/$/, "")
}

export const buildStoreMediaPublicUrl = (
  kind: StoreMediaKind,
  fileName: string,
  baseUrl?: string
): string => {
  const root = resolveStoreMediaBaseUrl(undefined, baseUrl)
  return `${root}/static/${storeMediaFolder(kind)}/${fileName}`
}

// Backward-compatible logo helpers
export const LOGO_MAX_BYTES = STORE_MEDIA_MAX_BYTES.logo
export const LOGO_ALLOWED_TYPES = STORE_IMAGE_ALLOWED_TYPES
export const validateLogoUpload = (fileBase64: string, contentType: string) =>
  validateStoreImageUpload("logo", fileBase64, contentType)
export const resolveLogoUploadDir = (cwd?: string) => resolveStoreMediaUploadDir("logo", cwd)
export const buildLogoPublicUrl = (fileName: string, baseUrl?: string) =>
  buildStoreMediaPublicUrl("logo", fileName, baseUrl)
