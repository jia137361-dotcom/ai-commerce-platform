import {
  isPlatformCheckoutComplete,
  markPlatformCheckoutOrderComplete,
  nextPendingPlatformCheckoutGroup,
  readPlatformCheckoutSession,
  writePlatformCheckoutSession,
  type PlatformCheckoutSession,
} from "./platform-checkout-session"

const sessionStorageMock = (() => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
    clear: () => values.clear(),
  }
})()

beforeEach(() => {
  sessionStorageMock.clear()
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: sessionStorageMock },
  })
})

const sampleSession = (): PlatformCheckoutSession => ({
  platform_checkout_id: "pc_test",
  completed_order_ids: [],
  completed_store_ids: [],
  groups: [
    {
      store_id: "store_a",
      cart_id: "cart_a",
      store_name: "Store A",
      platform_checkout_index: 0,
      platform_checkout_count: 2,
    },
    {
      store_id: "store_b",
      cart_id: "cart_b",
      store_name: "Store B",
      platform_checkout_index: 1,
      platform_checkout_count: 2,
    },
  ],
})

describe("platform-checkout-session", () => {
  it("tracks completed stores and finds the next pending group", () => {
    writePlatformCheckoutSession(sampleSession())
    expect(readPlatformCheckoutSession()?.platform_checkout_id).toBe("pc_test")
    expect(nextPendingPlatformCheckoutGroup(readPlatformCheckoutSession())?.store_id).toBe("store_a")

    const updated = markPlatformCheckoutOrderComplete("store_a", "order_a")
    expect(updated?.completed_store_ids).toEqual(["store_a"])
    expect(nextPendingPlatformCheckoutGroup(updated)?.store_id).toBe("store_b")

    const finished = markPlatformCheckoutOrderComplete("store_b", "order_b")
    expect(isPlatformCheckoutComplete(finished)).toBe(true)
  })
})
