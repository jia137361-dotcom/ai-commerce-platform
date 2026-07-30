import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  AuthLegalCopy,
  DisabledSocialAuth,
  isValidAuthEmail,
  PasswordField,
} from "./AuthPrimitives"

describe("buyer auth primitives", () => {
  it("validates email format", () => {
    expect(isValidAuthEmail("buyer@example.com")).toBe(true)
    expect(isValidAuthEmail("bad-email")).toBe(false)
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

  it("renders social auth as disabled", () => {
    const html = renderToStaticMarkup(createElement(DisabledSocialAuth))
    expect(html).toContain("Social login is not available yet")
    expect(html).toContain("disabled")
  })
})
