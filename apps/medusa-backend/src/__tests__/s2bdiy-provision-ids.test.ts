import { resolveS2bIdsFromEnvOrVariant } from "../lib/s2bdiy/provision-s2b-product"

describe("resolveS2bIdsFromEnvOrVariant", () => {
  const oldEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...oldEnv }
    delete process.env.S2BDIY_TEST_BASIC_PRODUCT_ID
    delete process.env.S2BDIY_TEST_SIZE_ID
    delete process.env.S2BDIY_TEST_COLOR_ID
    delete process.env.S2BDIY_TEST_VIEW_ID
  })

  afterAll(() => {
    process.env = oldEnv
  })

  it("uses formal product fields and supplier variant ids", () => {
    expect(
      resolveS2bIdsFromEnvOrVariant(
        {
          supplier_size_id: "12",
          supplier_color_id: "34",
        },
        {
          basic_product_id: "1672",
          view_id: "1",
        }
      )
    ).toEqual({
      basicProductId: "1672",
      sizeId: 12,
      colorId: 34,
      viewId: 1,
    })
  })

  it("does not read deprecated metadata fallback fields", () => {
    expect(
      resolveS2bIdsFromEnvOrVariant(undefined, {
        metadata: {
          basic_product_id: "1672",
          supplier_size_id: "12",
          supplier_color_id: "34",
        },
      })
    ).toBeNull()
  })
})
