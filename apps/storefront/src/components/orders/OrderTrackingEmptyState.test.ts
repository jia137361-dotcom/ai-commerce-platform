import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { OrderTrackingEmptyState } from "./OrderTrackingEmptyState"

describe("OrderTrackingEmptyState", () => {
  it("does not claim demo milestones are real carrier data", () => {
    const html = renderToStaticMarkup(createElement(OrderTrackingEmptyState, {
      title: "Tracking not available yet",
      message: "No carrier, tracking number, shipment, or delivery events have been reported for this order.",
    }))
    expect(html).toContain("Tracking not available yet")
    expect(html).toContain("No carrier")
    expect(html).not.toContain("In transit")
    expect(html).not.toContain("Delivered")
  })
})
