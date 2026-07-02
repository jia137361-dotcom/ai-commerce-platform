import { savedAddressToCheckout } from "./checkout-saved-address"

describe("savedAddressToCheckout", () => {
  it("maps a real customer address into checkout delivery and receiver fields", () => {
    expect(savedAddressToCheckout({
      id: "ca_1",
      label: "Home",
      firstName: "Buyer",
      lastName: "A",
      address1: "1 Test Road",
      address2: "Room 2",
      city: "Shanghai",
      province: "Shanghai",
      postalCode: "200000",
      countryCode: "cn",
      phone: "10000000000",
      isDefaultShipping: true,
      isDefaultBilling: false,
    })).toEqual({
      address: { country: "cn", state: "Shanghai", city: "Shanghai", address1: "1 Test Road", address2: "Room 2", postalCode: "200000", label: "Home" },
      name: "Buyer A",
      phone: "10000000000",
    })
  })
})
