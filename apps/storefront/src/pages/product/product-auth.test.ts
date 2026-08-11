import { buildProductSignInHref } from "./product-auth"

describe("product add-to-cart authentication", () => {
  it("redirects logged-out buyers to sign in with the product return path", () => {
    expect(buildProductSignInHref("/products/prod_123?ref=store"))
      .toBe("/account/sign-in?returnTo=%2Fproducts%2Fprod_123%3Fref%3Dstore")
  })

  it("rejects an external return target", () => {
    expect(buildProductSignInHref("https://example.com/products/prod_123"))
      .toBe("/account/sign-in?returnTo=%2Fstore")
  })
})
