import { clearBuyerAuthClientState } from "./buyer-auth-state"

const storage = (values: Record<string, string>) => ({
  values,
  removeItem(key: string) {
    delete this.values[key]
  },
})

describe("buyer sign out state cleanup", () => {
  it("clears only buyer auth state and preserves cart and seller login state", () => {
    const local = storage({
      buyer_auth_token: "stale-buyer-token",
      buyer_customer: "stale-customer",
      "citigoo:default_store:cart_id": "cart_1",
      seller_admin_token: "seller-token",
    })
    const session = storage({ "citigoo:buyer_customer": "stale-session-customer" })

    clearBuyerAuthClientState(local, session)

    expect(local.values.buyer_auth_token).toBeUndefined()
    expect(local.values.buyer_customer).toBeUndefined()
    expect(session.values["citigoo:buyer_customer"]).toBeUndefined()
    expect(local.values["citigoo:default_store:cart_id"]).toBe("cart_1")
    expect(local.values.seller_admin_token).toBe("seller-token")
  })
})
