import { sanitizeProductDescription } from "./product-description"

describe("sanitizeProductDescription", () => {
  it("preserves supplier block paragraphs and emphasis", () => {
    expect(sanitizeProductDescription("<h3><strong>Important</strong></h3><h3>Care instructions</h3>"))
      .toBe("<h3><strong>Important</strong></h3><h3>Care instructions</h3>")
  })
  it("keeps supported formatting and removes unsafe markup", () => {
    expect(
      sanitizeProductDescription('<p>Hello <strong>world</strong></p><script>alert("x")</script>'),
    ).toBe("<p>Hello <strong>world</strong></p>")
  })

  it("preserves plain text descriptions", () => {
    expect(sanitizeProductDescription("First paragraph\nSecond paragraph")).toContain("First paragraph")
    expect(sanitizeProductDescription("First paragraph\nSecond paragraph")).toContain("Second paragraph")
  })
})
