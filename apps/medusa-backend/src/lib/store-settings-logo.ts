export const LOGO_MAX_BYTES = 2 * 1024 * 1024

export const LOGO_ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"])

export type LogoValidationResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; message: string }

export const validateLogoUpload = (
  fileBase64: string,
  contentType: string
): LogoValidationResult => {
  if (!fileBase64) {
    return { ok: false, message: "file_base64 is required" }
  }

  if (!LOGO_ALLOWED_TYPES.has(contentType)) {
    return { ok: false, message: "content_type must be image/png or image/jpeg" }
  }

  const buffer = Buffer.from(fileBase64, "base64")
  if (buffer.length === 0 || buffer.length > LOGO_MAX_BYTES) {
    return { ok: false, message: "Logo must be between 1 byte and 2MB" }
  }

  return { ok: true, buffer }
}

export const resolveLogoUploadDir = (cwd: string = process.cwd()): string => {
  return `${cwd}/static/logos`
}

export const buildLogoPublicUrl = (fileName: string, baseUrl?: string): string => {
  const root = (baseUrl || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
  return `${root}/static/logos/${fileName}`
}
