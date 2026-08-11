import {
  reduceVerifyEmailUiState,
  sanitizeVerificationCodeInput,
  type VerifyEmailUiState,
} from "./verify-email-state"

describe("VerifyEmailPage state", () => {
  it("keeps verification codes as strings and preserves leading zeroes", () => {
    expect(sanitizeVerificationCodeInput("012345")).toBe("012345")
    expect(sanitizeVerificationCodeInput(" 0a1b2c3d4e5 ")).toBe("012345")
  })

  it("clears old verification errors when the buyer edits the code", () => {
    const state: VerifyEmailUiState = {
      code: "123456",
      error: "Verification code is invalid or expired.",
      message: "A new verification code was sent.",
    }
    expect(reduceVerifyEmailUiState(state, { type: "code_change", value: "000001" })).toEqual({
      code: "000001",
      error: undefined,
      message: "A new verification code was sent.",
    })
  })

  it("resend success clears stale code and error and tells the buyer only the latest code is valid", () => {
    const state: VerifyEmailUiState = {
      code: "123456",
      error: "Verification failed",
      message: "Old status",
    }
    const sending = reduceVerifyEmailUiState(state, { type: "send_start" })
    expect(sending).toEqual({ code: "", error: undefined, message: undefined })

    expect(reduceVerifyEmailUiState(sending, { type: "send_success", email: "buyer@example.com" })).toEqual({
      code: "",
      error: undefined,
      message: "A new verification code was sent to buyer@example.com. Only the latest code is valid.",
    })
  })

  it("resend failure does not show a sent success state", () => {
    const state = reduceVerifyEmailUiState({ code: "", message: "Old sent status" }, { type: "send_failure" })
    expect(state.error).toBe("We couldn't send a verification code. Please try again later.")
    expect(state.message).toBeUndefined()
  })

  it("verify success clears errors and verify failure uses a safe message", () => {
    expect(reduceVerifyEmailUiState({
      code: "123456",
      error: "Old failure",
    }, { type: "verify_success" })).toEqual({
      code: "123456",
      error: undefined,
      message: "Email verified successfully.",
    })

    expect(reduceVerifyEmailUiState({ code: "123456" }, { type: "verify_failure" }).error)
      .toBe("Verification code is invalid or expired. Request a new code and try again.")
  })
})
