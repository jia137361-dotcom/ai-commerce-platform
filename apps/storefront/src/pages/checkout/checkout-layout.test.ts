import { readFileSync } from "node:fs"

describe("checkout layout", () => {
  it("keeps order summary between delivery and payment", () => {
    const page = readFileSync(require.resolve("./CheckoutPage"), "utf8")
    const css = readFileSync(require.resolve("../../styles/checkout.css"), "utf8")
    const addressIndex = page.indexOf("<CheckoutAddressCard")
    const summaryIndex = page.indexOf("<CheckoutSummaryCard")
    const paymentIndex = page.indexOf("<CheckoutPaymentPanel")
    const recoveryIndex = page.indexOf("<CheckoutPaymentRecoveryBanner")

    expect(addressIndex).toBeGreaterThan(-1)
    expect(summaryIndex).toBeGreaterThan(addressIndex)
    expect(paymentIndex).toBeGreaterThan(summaryIndex)
    expect(recoveryIndex).toBeGreaterThan(paymentIndex)
    expect(css).toContain("grid-template-columns: minmax(0, 1fr);")
    expect(css).not.toContain("display: contents;")
  })
})
