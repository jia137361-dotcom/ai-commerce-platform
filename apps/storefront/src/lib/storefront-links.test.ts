import { buildStoreMessagesHref } from "./storefront-links"

describe("storefront links", () => {
  it("scopes buyer-seller messages to the target store", () => {
    expect(buildStoreMessagesHref("store_a")).toBe("/account/messages?store_id=store_a")
  })

  it("preserves order context on store-scoped message links", () => {
    expect(buildStoreMessagesHref("store_a", "order_1")).toBe(
      "/account/messages?store_id=store_a&orderId=order_1"
    )
  })
})
