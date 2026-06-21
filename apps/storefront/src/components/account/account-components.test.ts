import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { AccountAuthRequired } from "./AccountAuthRequired"
import { AccountNavigation } from "./AccountNavigation"
import { AccountProfileForm } from "./AccountProfileForm"
import { RegisterForm } from "./RegisterForm"
import { SignInForm } from "./SignInForm"

const customer = { id: "cus_1", email: "buyer@example.com" }

describe("buyer account components", () => {
  it("shows switch account in account navigation", () => {
    const html = renderToStaticMarkup(createElement(AccountNavigation, {
      customer,
      onSignOut: () => undefined,
      onSwitchAccount: () => undefined,
    }))
    expect(html).toContain("Switch account")
    expect(html).toContain("Orders")
    expect(html).toContain("Profile")
  })

  it("shows sign-in and registration actions for unauthenticated buyers", () => {
    const html = renderToStaticMarkup(createElement(AccountAuthRequired))
    expect(html).toContain('href="/account/sign-in"')
    expect(html).toContain('href="/account/register"')
  })

  it("shows Not provided for missing profile fields", () => {
    const html = renderToStaticMarkup(createElement(AccountProfileForm, {
      customer,
      loading: false,
      onSubmit: async () => undefined,
    }))
    expect(html.match(/Not provided/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html).toContain("Address")
    expect(html).toContain("editing are unavailable")
  })

  it("renders a clear sign-in error state", () => {
    const html = renderToStaticMarkup(createElement(SignInForm, {
      loading: false,
      error: "Incorrect email or password.",
      onSubmit: async () => undefined,
    }))
    expect(html).toContain("Sign-in failed")
    expect(html).toContain("Incorrect email or password.")
    expect(html).toContain('role="alert"')
  })

  it("renders a clear registration error state", () => {
    const html = renderToStaticMarkup(createElement(RegisterForm, {
      loading: false,
      error: "An account already exists.",
      onSubmit: async () => undefined,
    }))
    expect(html).toContain("Registration failed")
    expect(html).toContain("An account already exists.")
    expect(html).toContain('role="alert"')
  })
})
