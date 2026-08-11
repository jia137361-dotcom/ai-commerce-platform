import {
  appendNewsletterSubscriber,
  applyFollowDelta,
  countUniqueStoreFollowers,
  listStoreFollowers,
  readFollowerCount,
} from "../lib/store-engagement"

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

  it("lists unique followers with display names", () => {
    const rows = listStoreFollowers(
      [
        {
          id: "buyer_a",
          email: "a@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
          metadata: { followed_store_ids: ["store_1"] },
        },
        {
          id: "buyer_b",
          email: "b@example.com",
          metadata: { followed_store_ids: ["store_1", "store_2"] },
        },
        {
          id: "buyer_b",
          email: "b@example.com",
          metadata: { followed_store_ids: ["store_1"] },
        },
        {
          id: "buyer_c",
          email: "c@example.com",
          metadata: { followed_store_ids: ["store_2"] },
        },
      ],
      "store_1"
    )
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.customer_id).sort()).toEqual(["buyer_a", "buyer_b"])
    expect(rows.find((row) => row.customer_id === "buyer_a")?.display_name).toBe("Ada Lovelace")
    expect(rows.find((row) => row.customer_id === "buyer_b")?.display_name).toBe("b@example.com")
  })
})
