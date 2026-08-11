const ORIGINAL_ENV = process.env

let mockSendEmail: jest.Mock
let mockConstructedApiKeys: string[]

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation((apiKey: string) => {
    mockConstructedApiKeys.push(apiKey)
    return {
      emails: {
        send: mockSendEmail,
      },
    }
  }),
}))

async function loadEmailModule() {
  jest.resetModules()
  return import("../lib/email.js")
}

describe("auth email delivery", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "test" }
    delete process.env.AUTH_EMAIL_DELIVERY_MODE
    delete process.env.AUTH_DEV_CODE_ENABLED
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    mockConstructedApiKeys = []
    mockSendEmail = jest.fn(async () => ({ data: { id: "email_123" }, error: null }))
    jest.spyOn(console, "info").mockImplementation(() => undefined)
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
    jest.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it("does not call Resend in local delivery mode", async () => {
    process.env.AUTH_EMAIL_DELIVERY_MODE = "local"
    const { sendBuyerEmailVerificationCode } = await loadEmailModule()
    const result = await sendBuyerEmailVerificationCode({
      to: "buyer@example.com",
      code: "123456",
      expiresInMinutes: 15,
    })
    expect(result.success).toBe(true)
    expect(mockConstructedApiKeys).toEqual([])
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it("calls Resend with the correct recipient and idempotency key", async () => {
    process.env.AUTH_EMAIL_DELIVERY_MODE = "resend"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.EMAIL_FROM = "Ciiverse <onboarding@resend.dev>"
    const { sendBuyerEmailVerificationCode } = await loadEmailModule()

    const result = await sendBuyerEmailVerificationCode({
      to: "buyer@example.com",
      code: "123456",
      expiresInMinutes: 15,
      idempotencyKey: "idem_safe_key",
    })

    expect(result).toEqual({ success: true, id: "email_123" })
    expect(mockConstructedApiKeys).toEqual(["re_test_key"])
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Ciiverse <onboarding@resend.dev>",
      to: ["buyer@example.com"],
      subject: "Verify your Ciiverse email",
    }), { idempotencyKey: "idem_safe_key" })
  })

  it("renders verification and reset emails with the code-based UX", async () => {
    process.env.AUTH_EMAIL_DELIVERY_MODE = "resend"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.EMAIL_FROM = "Ciiverse <onboarding@resend.dev>"
    const { sendBuyerEmailVerificationCode, sendBuyerPasswordResetCode } = await loadEmailModule()

    await sendBuyerEmailVerificationCode({ to: "buyer@example.com", code: "654321", expiresInMinutes: 15 })
    await sendBuyerPasswordResetCode({ to: "buyer@example.com", code: "111222", expiresInMinutes: 30 })

    const verificationPayload = mockSendEmail.mock.calls[0][0]
    const resetPayload = mockSendEmail.mock.calls[1][0]
    expect(verificationPayload.html).toContain("654321")
    expect(verificationPayload.html).toContain("15 minutes")
    expect(resetPayload.html).toContain("111222")
    expect(resetPayload.html).toContain("can be used once")
    expect(resetPayload.subject).toBe("Reset your Ciiverse password")
  })

  it("safely handles provider errors without logging code or API key", async () => {
    process.env.AUTH_EMAIL_DELIVERY_MODE = "resend"
    process.env.RESEND_API_KEY = "re_sensitive_key"
    process.env.EMAIL_FROM = "Ciiverse <onboarding@resend.dev>"
    mockSendEmail.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "bad 987654 re_sensitive_key" },
    })
    const { sendBuyerEmailVerificationCode } = await loadEmailModule()

    const result = await sendBuyerEmailVerificationCode({
      to: "buyer@example.com",
      code: "987654",
      expiresInMinutes: 15,
    })

    expect(result.success).toBe(false)
    const logs = [
      ...((console.info as jest.Mock).mock.calls),
      ...((console.warn as jest.Mock).mock.calls),
      ...((console.error as jest.Mock).mock.calls),
    ].flat().map(String).join(" ")
    expect(logs).not.toContain("987654")
    expect(logs).not.toContain("re_sensitive_key")
  })

  it("fails safely when API key or sender is missing in resend mode", async () => {
    process.env.AUTH_EMAIL_DELIVERY_MODE = "resend"
    process.env.EMAIL_FROM = "Ciiverse <onboarding@resend.dev>"
    let module = await loadEmailModule()
    await expect(module.sendBuyerEmailVerificationCode({
      to: "buyer@example.com",
      code: "123456",
      expiresInMinutes: 15,
    })).resolves.toEqual(expect.objectContaining({ success: false }))
    expect(mockSendEmail).not.toHaveBeenCalled()

    process.env.RESEND_API_KEY = "re_test_key"
    delete process.env.EMAIL_FROM
    module = await loadEmailModule()
    await expect(module.sendBuyerPasswordResetCode({
      to: "buyer@example.com",
      code: "123456",
      expiresInMinutes: 30,
    })).resolves.toEqual(expect.objectContaining({ success: false }))
  })
})
