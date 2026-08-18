const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6"])
const BLOCKED_CONTENT_PATTERN = /<\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi
const TAG_PATTERN = /<!--[\s\S]*?-->|<\/?\s*([a-z][a-z0-9]*)\b[^>]*>/gi

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

const plainTextToHtml = (value: string) =>
  value
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br />")}</p>`)
    .join("")

export function sanitizeProductDescription(value: string): string {
  if (!value) return ""
  if (!/<\s*\/?\s*[a-z][^>]*>/i.test(value)) return plainTextToHtml(value)

  const withoutBlockedContent = value.replace(BLOCKED_CONTENT_PATTERN, "")
  return withoutBlockedContent.replace(TAG_PATTERN, (tag, tagName: string) => {
    const normalizedTag = tagName.toLowerCase()
    if (!ALLOWED_TAGS.has(normalizedTag)) return ""
    if (/^<\s*\//.test(tag)) return `</${normalizedTag}>`
    if (normalizedTag === "br") return "<br />"
    return `<${normalizedTag}>`
  })
}
