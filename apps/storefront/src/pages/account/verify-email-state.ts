export type VerifyEmailUiState = {
  code: string
  error?: string
  message?: string
}

type VerifyEmailUiAction =
  | { type: "code_change"; value: string }
  | { type: "send_start" }
  | { type: "send_success"; email: string }
  | { type: "send_failure" }
  | { type: "verify_start" }
  | { type: "verify_failure" }
  | { type: "verify_validation_error"; message: string }
  | { type: "verify_success" }

export const sanitizeVerificationCodeInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, 6)

export function reduceVerifyEmailUiState(
  state: VerifyEmailUiState,
  action: VerifyEmailUiAction
): VerifyEmailUiState {
  switch (action.type) {
    case "code_change":
      return { ...state, code: sanitizeVerificationCodeInput(action.value), error: undefined }
    case "send_start":
      return { code: "", error: undefined, message: undefined }
    case "send_success":
      return {
        code: "",
        error: undefined,
        message: `A new verification code was sent to ${action.email}. Only the latest code is valid.`,
      }
    case "send_failure":
      return {
        ...state,
        error: "We couldn't send a verification code. Please try again later.",
        message: undefined,
      }
    case "verify_start":
      return { ...state, error: undefined }
    case "verify_validation_error":
      return { ...state, error: action.message }
    case "verify_failure":
      return {
        ...state,
        error: "Verification code is invalid or expired. Request a new code and try again.",
      }
    case "verify_success":
      return { ...state, error: undefined, message: "Email verified successfully." }
    default:
      return state
  }
}
