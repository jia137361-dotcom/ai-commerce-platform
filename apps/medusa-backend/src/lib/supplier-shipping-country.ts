import { normalizeShipFromCountryCode } from "./ship-from-country"

export function resolveSupplierShipFromCountry(
  product: { ship_from_country?: unknown } | null | undefined,
  supplier: { produce_country?: unknown } | null | undefined,
): string | null {
  return (
    normalizeShipFromCountryCode(product?.ship_from_country) ??
    normalizeShipFromCountryCode(supplier?.produce_country)
  )
}
