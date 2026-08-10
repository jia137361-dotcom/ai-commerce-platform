import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { AccountAuthRequired } from "./AccountAuthRequired"
import { AccountNavigation } from "./AccountNavigation"
import { AccountProfileForm } from "./AccountProfileForm"
import { RegisterForm } from "./RegisterForm"
import { SignInForm } from "./SignInForm"

jest.mock("../../lib/buyer-api", () => ({
  sendBuyerLoginOtp: jest.fn(async () => ({ sent: true, email: "user@gmail.com" })),
}))

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
    expect(html.match(/Not provided/g)?.length).toBeGreaterThanOrEqual(3)
    expect(html).toContain("Delivery addresses")
    expect(html).toContain("Manage saved addresses")
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

  it("register starts with email code and consent; password appears after code is sent", () => {
    const html = renderToStaticMarkup(createElement(RegisterForm, {
      loading: false,
      onSubmit: async () => undefined,
    }))
    expect(html).toContain("Email")
    expect(html).toContain("Send verification code")
    expect(html).toContain("Terms of Use")
    expect(html).toContain("Privacy Policy")
    expect(html).toContain("Keep me signed in")
    expect(html).not.toContain("Create a password")
    expect(html).not.toContain("First name")
    expect(html).not.toContain("Last name")
    expect(html).not.toContain("Phone")
  })

  it("sign-in defaults to password with email-code alternate", () => {
    const html = renderToStaticMarkup(createElement(SignInForm, {
      loading: false,
      onSubmit: async () => undefined,
    }))
    expect(html).toContain('href="/account/forgot-password"')
    expect(html).toContain("Sign in")
    expect(html).toContain("Keep me signed in")
    expect(html).toContain("Use email code instead")
    expect(html).toContain("coming soon")
  })
})
