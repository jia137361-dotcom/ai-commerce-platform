import {
  buildS2bShippingQuoteMetadata,
  type S2bCartShippingQuote,
} from "../lib/s2bdiy/quote-s2b-shipping-for-cart"

describe("buildS2bShippingQuoteMetadata", () => {
  it("stores destination keys so later selects can reuse the quote", () => {
    const quote: S2bCartShippingQuote = {
      amountMinor: 146,
      amountUsd: 1.46,
      amountCny: 10,
      logisticsPlatformId: "1",
      logisticsName: "Standard",
      basicProductId: "bp_1",
      currencyCode: "usd",
      source: "s2bdiy_logisticsCalculation",
      quotedAt: "2026-07-27T00:00:00.000Z",
    }

    expect(
      buildS2bShippingQuoteMetadata(
        quote,
        { country: "US", province: "CA", postcode: "94105" },
        2
      )
    ).toMatchObject({
      amount_minor: 146,
      amount_usd: 1.46,
      country: "US",
      province: "CA",
      postcode: "94105",
      quantity: 2,
      basic_product_id: "bp_1",
      quoted_at: "2026-07-27T00:00:00.000Z",
    })
  })
})
