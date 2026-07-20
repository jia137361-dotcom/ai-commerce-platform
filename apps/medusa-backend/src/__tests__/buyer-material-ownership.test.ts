import { buyerOwnsAiMaterial } from "../lib/ai-generation/buyer-generate"
import {
  buyerOwnsLegacyResource,
  buyerOwnsResource,
  readBuyerResourceOwner,
} from "../lib/buyer-resource-ownership"

describe("buyerOwnsAiMaterial", () => {
  const completeJob = (owner: { customer_id?: string | null; guest_key?: string | null }) => ({
    id: "job_1",
    status: "complete",
    payload: {
      buyer_diy: true,
      prompt: "test",
      customer_id: owner.customer_id ?? null,
      guest_key: owner.guest_key ?? null,
    },
    metadata: {
      customer_id: owner.customer_id ?? null,
      guest_key: owner.guest_key ?? null,
    },
    result: {
      design_image_url: "https://example.com/design.png",
      library_item: true,
    },
  })

  it("shows legacy jobs without owner to any visitor", () => {
    const legacy = completeJob({})
    expect(buyerOwnsAiMaterial(legacy, null, null)).toBe(true)
    expect(buyerOwnsAiMaterial(legacy, "cus_a", null)).toBe(true)
  })

  it("scopes customer-owned jobs to that account", () => {
    const owned = completeJob({ customer_id: "cus_a" })
    expect(buyerOwnsAiMaterial(owned, "cus_a", null)).toBe(true)
    expect(buyerOwnsAiMaterial(owned, "cus_b", null)).toBe(false)
    expect(buyerOwnsAiMaterial(owned, null, "guest_1")).toBe(false)
  })

  it("scopes guest jobs to matching guest_key", () => {
    const guest = completeJob({ guest_key: "guest_1" })
    expect(buyerOwnsAiMaterial(guest, null, "guest_1")).toBe(true)
    expect(buyerOwnsAiMaterial(guest, null, "guest_2")).toBe(false)
  })

  it("allows signed-in buyer to claim guest-only jobs from same browser", () => {
    const guest = completeJob({ guest_key: "guest_1" })
    expect(buyerOwnsAiMaterial(guest, "cus_a", "guest_1")).toBe(true)
  })
})

describe("buyerOwnsResource", () => {
  it("matches my-designs ownership rules", () => {
    expect(
      buyerOwnsResource(
        readBuyerResourceOwner({ customer_id: "cus_a", guest_key: "guest_old" }),
        "cus_a",
        "guest_old"
      )
    ).toBe(true)
    expect(
      buyerOwnsResource(
        readBuyerResourceOwner({ customer_id: "cus_a", guest_key: "guest_old" }),
        "cus_b",
        "guest_old"
      )
    ).toBe(false)
  })
})

describe("buyerOwnsLegacyResource", () => {
  it("falls back to legacy visibility when owner is missing", () => {
    expect(buyerOwnsLegacyResource(readBuyerResourceOwner({}), null, null)).toBe(true)
  })
})
