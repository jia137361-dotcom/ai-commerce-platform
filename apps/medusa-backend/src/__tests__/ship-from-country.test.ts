import {
  getShipFromCountryLabel,
  normalizeShipFromCountryCode,
  SHIP_FROM_COUNTRY_LABELS,
} from "../lib/ship-from-country"

describe("ship-from-country helpers", () => {
  it("normalizes country codes to uppercase", () => {
    expect(normalizeShipFromCountryCode(" us ")).toBe("US")
    expect(normalizeShipFromCountryCode("")).toBeNull()
  })

  it("maps known codes to buyer-friendly labels", () => {
    expect(getShipFromCountryLabel("us")).toBe("United States")
    expect(getShipFromCountryLabel("EU")).toBe("Europe")
  })

  it("falls back to the code when no label exists", () => {
    expect(getShipFromCountryLabel("ZZ")).toBe("ZZ")
  })

  it("includes the core marketplace codes", () => {
    expect(SHIP_FROM_COUNTRY_LABELS.CN).toBe("China")
    expect(SHIP_FROM_COUNTRY_LABELS.US).toBe("United States")
  })
})
