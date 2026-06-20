import { syncCartLineItemShippingRequirements } from "../lib/sync-cart-line-item-shipping"

describe("syncCartLineItemShippingRequirements", () => {
  it("updates stale line items from mc_product preference", async () => {
    const updateLineItems = jest.fn().mockResolvedValue(undefined)
    const listProducts = jest
      .fn()
      .mockResolvedValue([
        {
          id: "prod_test",
          metadata: { requires_shipping: true },
          supplier_product_id: "sp_tshirt",
        },
      ])

    const items = [
      {
        id: "line_1",
        requires_shipping: false,
        metadata: { mc_product_id: "prod_test" },
      },
    ]

    const changed = await syncCartLineItemShippingRequirements(
      {
        resolve: (key: string) => {
          if (key === "store_core") {
            return { listProducts }
          }
          if (key === "cart") {
            return { updateLineItems }
          }
          throw new Error(`unexpected ${key}`)
        },
      } as never,
      "cart_test",
      items
    )

    expect(changed).toBe(true)
    expect(updateLineItems).toHaveBeenCalledWith(
      { id: "line_1" },
      { requires_shipping: true }
    )
    expect(items[0].requires_shipping).toBe(true)
  })

  it("skips items that already match product preference", async () => {
    const updateLineItems = jest.fn()
    const listProducts = jest.fn().mockResolvedValue([
      {
        id: "prod_test",
        metadata: { requires_shipping: true },
      },
    ])

    const changed = await syncCartLineItemShippingRequirements(
      {
        resolve: (key: string) => {
          if (key === "store_core") return { listProducts }
          if (key === "cart") return { updateLineItems }
          throw new Error(`unexpected ${key}`)
        },
      } as never,
      "cart_test",
      [
        {
          id: "line_1",
          requires_shipping: true,
          metadata: { mc_product_id: "prod_test" },
        },
      ]
    )

    expect(changed).toBe(false)
    expect(updateLineItems).not.toHaveBeenCalled()
  })
})
