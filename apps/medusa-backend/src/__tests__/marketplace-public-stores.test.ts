import { isMvpPublicStore } from "../lib/marketplace/public-marketplace"

describe("MVP public store visibility", () => {
  it("keeps the Ciiverse storefront visible while excluding fixture stores", () => {
    expect(isMvpPublicStore({ id: "01KX2P21ZPPSRYY6VJJERRBQYG", slug: "ciiverse" })).toBe(true)
    expect(isMvpPublicStore({ id: "default_store", slug: "default-store" })).toBe(true)
    expect(isMvpPublicStore({ id: "test_store", slug: "test-store" })).toBe(false)
    expect(isMvpPublicStore({ id: "mkt01_stripe_runtime", slug: "stripe-runtime" })).toBe(false)
  })
})
