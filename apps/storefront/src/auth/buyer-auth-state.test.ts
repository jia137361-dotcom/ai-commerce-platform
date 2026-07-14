import { clearBuyerAuthClientState } from "./buyer-auth-state"

const storage = (values: Record<string, string>) => ({
  values,
  getItem(key: string) {
    return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null
  },
  setItem(key: string, value: string) {
    this.values[key] = value
  },
  removeItem(key: string) {
    delete this.values[key]
  },
})

describe("buyer sign out state cleanup", () => {
  const setup = () => {
    const local = storage({
      buyer_auth_token: "stale-buyer-token",
      buyer_customer: "stale-customer",
      "citigoo:buyer_auth_token": "namespaced-token",
      "citigoo:default_store:cart:buyer%3Acus_1": "cart_1",
      "citigoo:buyer-my-designs": JSON.stringify([{ mcProductId: "prod_shared" }]),
      "citigoo:buyer-design-guest-key": "guest_shared",
      "citigoo:my-designs:guest%3Aguest_shared": JSON.stringify([{ mcProductId: "prod_guest" }]),
      seller_admin_token: "seller-token",
    })
    const session = storage({ "citigoo:buyer_customer": "stale-session-customer" })
    return { local, session }
  }

  it("clears buyer auth state from local and session storage", () => {
    const { local, session } = setup()

    clearBuyerAuthClientState(local, session)

    expect(local.values.buyer_auth_token).toBeUndefined()
    expect(local.values.buyer_customer).toBeUndefined()
    expect(local.values["citigoo:buyer_auth_token"]).toBeUndefined()
    expect(session.values["citigoo:buyer_customer"]).toBeUndefined()
  })

  it("keeps the buyer cart", () => {
    const { local, session } = setup()
    clearBuyerAuthClientState(local, session)
    expect(local.values["citigoo:default_store:cart:buyer%3Acus_1"]).toBe("cart_1")
  })

  it("keeps seller dashboard login state", () => {
    const { local, session } = setup()
    clearBuyerAuthClientState(local, session)
    expect(local.values.seller_admin_token).toBe("seller-token")
  })

  it("clears shared design drafts and rotates the guest key", () => {
    const { local, session } = setup()
    clearBuyerAuthClientState(local, session)
    expect(local.values["citigoo:buyer-my-designs"]).toBeUndefined()
    expect(local.values["citigoo:my-designs:guest%3Aguest_shared"]).toBeUndefined()
    expect(local.values["citigoo:buyer-design-guest-key"]).toBeTruthy()
    expect(local.values["citigoo:buyer-design-guest-key"]).not.toBe("guest_shared")
  })
})
