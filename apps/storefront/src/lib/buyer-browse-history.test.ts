import { pushBrowseHistory, readBrowseHistory } from "./buyer-browse-history"

const storage = (() => {
  let data: Record<string, string> = {}
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
    clear: () => {
      data = {}
    },
  }
})()

describe("buyer browse history", () => {
  beforeEach(() => {
    storage.clear()
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
    })
  })

  it("keeps browsing history isolated by buyer account", () => {
    pushBrowseHistory({ id: "prod_a", title: "Account A item", href: "/products/prod_a" }, { customerId: "cus_a" })
    pushBrowseHistory({ id: "prod_b", title: "Account B item", href: "/products/prod_b" }, { customerId: "cus_b" })

    expect(readBrowseHistory({ customerId: "cus_a" }).map((item) => item.id)).toEqual(["prod_a"])
    expect(readBrowseHistory({ customerId: "cus_b" }).map((item) => item.id)).toEqual(["prod_b"])
    expect(readBrowseHistory()).toEqual([])
  })

  it("deduplicates inside the same account bucket only", () => {
    pushBrowseHistory({ id: "prod_a", title: "First", href: "/products/prod_a" }, { email: "buyer@example.com" })
    pushBrowseHistory({ id: "prod_a", title: "Latest", href: "/products/prod_a?x=1" }, { email: "buyer@example.com" })

    expect(readBrowseHistory({ email: "BUYER@example.com" })).toEqual([
      { id: "prod_a", title: "Latest", href: "/products/prod_a?x=1" },
    ])
  })
})
