import { buildStoreHref, buildStoreMessagesHref, resolveMessageStoreId } from "./storefront-links"

describe("storefront links", () => {
  const memory = new Map<string, string>()

  beforeEach(() => {
    memory.clear()
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => memory.get(key) ?? null,
          setItem: (key: string, value: string) => {
            memory.set(key, value)
          },
          clear: () => memory.clear(),
        },
      },
    })
  })

  it("scopes buyer-seller messages to the target store", () => {
    expect(buildStoreMessagesHref("store_a")).toBe("/account/messages?store_id=store_a")
  })

  it("preserves order context on store-scoped message links", () => {
    expect(buildStoreMessagesHref("store_a", "order_1")).toBe(
      "/account/messages?store_id=store_a&orderId=order_1"
    )
  })

  it("never uses marketplace as the message store id", () => {
    memory.set("citigoo:active_store_id", "default_store")
    expect(resolveMessageStoreId("marketplace")).toBe("default_store")
    expect(buildStoreMessagesHref("marketplace")).toBe("/account/messages?store_id=default_store")
    expect(buildStoreHref({ storeId: "marketplace" })).toBe("/marketplace")
  })
})
