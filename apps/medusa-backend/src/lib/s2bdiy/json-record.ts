export function toJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return { value }
}
