import { appendNewsletterSubscriber, applyFollowDelta, readFollowerCount } from "../lib/store-engagement"

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
})
