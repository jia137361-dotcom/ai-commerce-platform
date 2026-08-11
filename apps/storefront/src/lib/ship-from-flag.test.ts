import { getShipFromFlagUrl, normalizeShipFromFlagCode } from "./ship-from-flag"

describe("ship-from-flag", () => {
  it("normalizes common aliases to ISO alpha-2", () => {
    expect(normalizeShipFromFlagCode("US")).toBe("us")
    expect(normalizeShipFromFlagCode("uk")).toBe("gb")
    expect(normalizeShipFromFlagCode("USA")).toBe("us")
    expect(normalizeShipFromFlagCode("EU")).toBe("eu")
    expect(normalizeShipFromFlagCode("")).toBeNull()
    expect(normalizeShipFromFlagCode("USA1")).toBeNull()
  })

  it("builds a flagcdn URL for valid codes", () => {
    expect(getShipFromFlagUrl("CN")).toBe("https://flagcdn.com/w40/cn.png")
    expect(getShipFromFlagUrl("GB")).toBe("https://flagcdn.com/w40/gb.png")
    expect(getShipFromFlagUrl(null)).toBeNull()
  })
})
