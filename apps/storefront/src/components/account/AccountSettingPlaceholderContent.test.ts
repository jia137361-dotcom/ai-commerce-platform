import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { accountSettingPlaceholders, findAccountSettingPlaceholder } from "../../pages/account/account-setting-placeholders"
import { AccountSettingPlaceholderContent } from "./AccountSettingPlaceholderContent"

describe("account design placeholders", () => {
  it("maps every deferred account design route", () => {
    expect(findAccountSettingPlaceholder("/account/security")?.slug).toBe("security")
    for (const slug of ["addresses", "country-region", "coupons", "currency", "following"]) expect(findAccountSettingPlaceholder(`/account/${slug}`)).toBeUndefined()
  })

  it("renders an honest unavailable state without a fake control", () => {
    const setting = accountSettingPlaceholders.find((item) => item.slug === "security")!
    const html = renderToStaticMarkup(createElement(AccountSettingPlaceholderContent, { setting }))
    expect(html).toContain("Account &amp; Security")
    expect(html).toContain("Coming later")
    expect(html).toContain("Unavailable in demo")
    expect(html).toContain("does not save preferences or call a new backend API")
  })
})
