import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  AuthLegalCopy,
  DisabledSocialAuth,
  isAllowedBuyerAuthEmail,
  isValidAuthEmail,
  PasswordField,
} from "./AuthPrimitives"

describe("buyer auth primitives", () => {
  it("validates email format", () => {
    expect(isValidAuthEmail("buyer@example.com")).toBe(true)
    expect(isValidAuthEmail("bad-email")).toBe(false)
  })

  it("allows gmail/apple emails and the QQ test account", () => {
    expect(isAllowedBuyerAuthEmail("user@gmail.com")).toBe(true)
    expect(isAllowedBuyerAuthEmail("user@icloud.com")).toBe(true)
    expect(isAllowedBuyerAuthEmail("1355026750@qq.com")).toBe(true)
    expect(isAllowedBuyerAuthEmail("other@qq.com")).toBe(false)
    expect(isAllowedBuyerAuthEmail("user@outlook.com")).toBe(false)
  })

  it("renders a password field with a visibility action", () => {
    const html = renderToStaticMarkup(createElement(PasswordField, {
      value: "",
      onChange: () => undefined,
      autoComplete: "new-password",
    }))
    expect(html).toContain("Password")
    expect(html).toContain("Show")
    expect(html).toContain("new-password")
  })

  it("renders terms and privacy links", () => {
    const html = renderToStaticMarkup(createElement(AuthLegalCopy))
    expect(html).toContain('href="/terms"')
    expect(html).toContain('href="/privacy"')
  })

  it("explains that social oauth is upcoming", () => {
    const html = renderToStaticMarkup(createElement(DisabledSocialAuth))
    expect(html).toContain("coming soon")
    expect(html).toContain("verification code")
  })
})
