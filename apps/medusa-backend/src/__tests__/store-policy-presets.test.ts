let buildReturnsPolicyText: (presets: Record<string, unknown>) => string
let buildShippingPolicyText: (presets: Record<string, unknown>) => string
let buildStorePolicyTexts: (
  presets: Record<string, unknown>,
  brandName?: string
) => Record<string, string>
let resolveStorePolicyDisplay: (
  metadata: Record<string, unknown> | null | undefined,
  brandName?: string
) => Record<string, string | undefined>

beforeAll(async () => {
  const sharedTypes = await import("@ai-commerce/shared-types")
  buildReturnsPolicyText = sharedTypes.buildReturnsPolicyText
  buildShippingPolicyText = sharedTypes.buildShippingPolicyText
  buildStorePolicyTexts = sharedTypes.buildStorePolicyTexts
  resolveStorePolicyDisplay = sharedTypes.resolveStorePolicyDisplay
})

describe("store policy presets", () => {
  it("builds shipping text from structured presets", () => {
    const text = buildShippingPolicyText({
      shipping_processing: "3_5",
      shipping_international: "yes",
      shipping_customs: "buyer_pays",
    })

    expect(text).toContain("3–5 business days")
    expect(text).toContain("import duties")
  })

  it("builds made-to-order return text when returns are disabled", () => {
    const text = buildReturnsPolicyText({ returns_window: "no_returns" })
    expect(text).toContain("final sale")
  })

  it("prefers generated preset text over legacy metadata strings", () => {
    const display = resolveStorePolicyDisplay({
      policy_presets: {
        shipping_processing: "1_3",
        shipping_international: "yes",
        shipping_customs: "buyer_pays",
      },
      shipping_policy: "Old free-text shipping policy",
    }, "Demo Shop")

    expect(display.shippingPolicy).toContain("1–3 business days")
    expect(display.shippingPolicy).not.toContain("Old free-text")
  })

  it("falls back to legacy policy strings when presets are absent", () => {
    const display = resolveStorePolicyDisplay({
      returns_policy: "Legacy returns policy",
    })

    expect(display.returnsPolicy).toBe("Legacy returns policy")
  })

  it("generates all five policy texts for save payloads", () => {
    const texts = buildStorePolicyTexts({}, "Citigoo")
    expect(texts.shipping_policy).toBeTruthy()
    expect(texts.payment_policy).toContain("Stripe")
    expect(texts.privacy_policy).toContain("Citigoo")
  })
})
