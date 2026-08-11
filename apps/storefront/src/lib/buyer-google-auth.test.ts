import {
  clearBuyerGoogleAuthContext,
  isGoogleAuthUiEnabled,
  isSafeBuyerReturnPath,
  readBuyerGoogleAuthContext,
  stashBuyerGoogleAuthContext,
  withGoogleAccountPickerPrompt,
} from "./buyer-google-auth"

describe("buyer google auth client helpers", () => {
  const previous = process.env.VITE_GOOGLE_AUTH_ENABLED
  const memory = new Map<string, string>()

  beforeEach(() => {
    memory.clear()
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        sessionStorage: {
          getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
          setItem: (key: string, value: string) => {
            memory.set(key, String(value))
          },
          removeItem: (key: string) => {
            memory.delete(key)
          },
          clear: () => memory.clear(),
        },
      },
    })
  })

  afterEach(() => {
    if (previous === undefined) delete process.env.VITE_GOOGLE_AUTH_ENABLED
    else process.env.VITE_GOOGLE_AUTH_ENABLED = previous
    // @ts-expect-error test cleanup
    delete globalThis.window
  })

  it("stores and reads return path + remember-me", () => {
    stashBuyerGoogleAuthContext({ returnTo: "/cart", rememberMe: false })
    expect(readBuyerGoogleAuthContext()).toEqual({
      returnTo: "/cart",
      rememberMe: false,
    })
    clearBuyerGoogleAuthContext()
    expect(readBuyerGoogleAuthContext().returnTo).toBe("/account")
  })

  it("rejects unsafe return paths", () => {
    expect(isSafeBuyerReturnPath("https://evil.example")).toBe("/account")
    expect(isSafeBuyerReturnPath("//evil.example")).toBe("/account")
    expect(isSafeBuyerReturnPath("/orders")).toBe("/orders")
  })

  it("reads the vite google auth feature flag from process.env", () => {
    process.env.VITE_GOOGLE_AUTH_ENABLED = "true"
    expect(isGoogleAuthUiEnabled()).toBe(true)
    process.env.VITE_GOOGLE_AUTH_ENABLED = "false"
    expect(isGoogleAuthUiEnabled()).toBe(false)
  })

  it("adds Google account picker prompt to auth URLs", () => {
    const url = withGoogleAccountPickerPrompt(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&redirect_uri=http%3A%2F%2F127.0.0.1%3A5174%2Fauth%2Fgoogle%2Fcallback"
    )
    expect(url).toContain("prompt=select_account")
  })
})
