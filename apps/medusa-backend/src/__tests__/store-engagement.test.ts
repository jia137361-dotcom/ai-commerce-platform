import { appendNewsletterSubscriber, applyFollowDelta, countUniqueStoreFollowers, readFollowerCount } from "../lib/store-engagement"

describe("store engagement helpers", () => {
  it("appends unique newsletter subscribers", () => {
    const first = appendNewsletterSubscriber({}, "Buyer@Example.com")
    const second = appendNewsletterSubscriber(first.metadata, "buyer@example.com")
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(first.metadata.newsletter_subscribers).toEqual(["buyer@example.com"])
  })

  it("tracks follower count deltas", () => {
    expect(readFollowerCount(applyFollowDelta({ follower_count: 2 }, 1))).toBe(3)
    expect(readFollowerCount(applyFollowDelta({ follower_count: 1 }, -1))).toBe(0)
  })

  it("counts unique customers following a store", () => {
    expect(countUniqueStoreFollowers([
      { id: "buyer_a", metadata: { followed_store_ids: ["store_1"] } },
      { id: "buyer_b", metadata: { followed_store_ids: ["store_1", "store_2"] } },
      { id: "buyer_b", metadata: { followed_store_ids: ["store_1"] } },
      { id: "buyer_c", metadata: { followed_store_ids: ["store_2"] } },
    ], "store_1")).toBe(2)
  })
})
