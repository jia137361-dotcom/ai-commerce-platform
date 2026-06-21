import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { accountSettingPlaceholders, findAccountSettingPlaceholder } from "../../pages/account/account-setting-placeholders"
import { AccountSettingPlaceholderContent } from "./AccountSettingPlaceholderContent"

describe("account design placeholders", () => {
  it("maps every deferred account design route", () => {
    for (const slug of ["security", "addresses", "country-region", "coupons", "currency", "following"]) {
      expect(findAccountSettingPlaceholder(`/account/${slug}`)?.slug).toBe(slug)
    }
  })

  it("renders an honest unavailable state without a fake control", () => {
    const setting = accountSettingPlaceholders.find((item) => item.slug === "coupons")!
    const html = renderToStaticMarkup(createElement(AccountSettingPlaceholderContent, { setting }))
    expect(html).toContain("Coupons")
    expect(html).toContain("Coming later")
    expect(html).toContain("Unavailable in demo")
    expect(html).toContain("does not save preferences or call a new backend API")
  })
})
