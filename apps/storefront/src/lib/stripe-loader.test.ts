const loadStripe = jest.fn()

jest.mock("@stripe/stripe-js", () => ({ loadStripe }))

describe("getStripePromise", () => {
  beforeEach(() => {
    jest.resetModules()
    loadStripe.mockReset()
  })

  it("retries after Stripe.js resolves null", async () => {
    const retryInstance = { confirmPayment: jest.fn() }
    loadStripe.mockResolvedValueOnce(null).mockResolvedValueOnce(retryInstance)

    const { getStripePromise } = await import("./stripe-loader")

    expect(await getStripePromise("pk_test_retry")).toBeNull()
    expect(await getStripePromise("pk_test_retry")).toBe(retryInstance)
    expect(loadStripe).toHaveBeenCalledTimes(2)
  })

  it("shares the successful Stripe.js instance for the same key", async () => {
    const instance = { confirmPayment: jest.fn() }
    loadStripe.mockResolvedValue(instance)

    const { getStripePromise } = await import("./stripe-loader")

    await expect(getStripePromise("pk_test_shared")).resolves.toBe(instance)
    await expect(getStripePromise("pk_test_shared")).resolves.toBe(instance)
    expect(loadStripe).toHaveBeenCalledTimes(1)
  })
})
