/** Map ship-from ISO country codes to a small flag image for product cards. */

const CODE_ALIASES: Record<string, string> = {
  UK: "gb",
  USA: "us",
}

export const normalizeShipFromFlagCode = (value?: string | null): string | null => {
  if (!value) return null
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return null
  const aliased = CODE_ALIASES[trimmed] ?? trimmed.toLowerCase()
  // ISO 3166-1 alpha-2 only (skip pseudo codes like EU).
  if (!/^[a-z]{2}$/.test(aliased)) return null
  return aliased
}

export const getShipFromFlagUrl = (countryCode?: string | null): string | null => {
  const code = normalizeShipFromFlagCode(countryCode)
  if (!code) return null
  return `https://flagcdn.com/w40/${code}.png`
}
