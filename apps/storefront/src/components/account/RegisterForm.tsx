import { useState } from "react"
import {
  AuthLegalCopy,
  DisabledSocialAuth,
  BUYER_PASSWORD_MIN_LENGTH,
  buyerAuthEmailHint,
  isAllowedBuyerAuthEmail,
  isValidAuthEmail,
  PasswordField,
} from "../auth/AuthPrimitives"
import { Button } from "../ui/Button"
import { FormField } from "../ui/FormField"
import { ErrorState } from "../ui/States"
import { sendBuyerLoginOtp } from "../../lib/buyer-api"

type RegisterFormProps = {
  loading: boolean
  error?: string
  onSubmit: (input: {
    email: string
    code: string
    password: string
    rememberMe: boolean
  }) => Promise<void>
}

export function RegisterForm({ loading, error, onSubmit }: RegisterFormProps) {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState<string>()
  const [sending, setSending] = useState(false)
  const [validation, setValidation] = useState<string>()

  const requestCode = async () => {
    if (!isValidAuthEmail(email)) {
      setValidation("Enter a valid email address.")
      return
    }
    if (!isAllowedBuyerAuthEmail(email)) {
      setValidation(buyerAuthEmailHint)
      return
    }
    if (!accepted) {
      setValidation("Review and accept the Terms of Use and Privacy Policy.")
      return
    }
    setSending(true)
    setValidation(undefined)
    try {
      const result = await sendBuyerLoginOtp(email)
      setCodeSent(true)
      setDevCode(result.devCode)
    } catch (sendError) {
      setValidation(sendError instanceof Error ? sendError.message : "Unable to send verification code.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      className="buyer-account-form buyer-auth-mobile-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!isValidAuthEmail(email)) {
          setValidation("Enter a valid email address.")
          return
        }
        if (!isAllowedBuyerAuthEmail(email)) {
          setValidation(buyerAuthEmailHint)
          return
        }
        if (!accepted) {
          setValidation("Review and accept the Terms of Use and Privacy Policy.")
          return
        }
        if (!codeSent) {
          void requestCode()
          return
        }
        if (!/^\d{6}$/.test(code.trim())) {
          setValidation("Enter the 6-digit code from your email.")
          return
        }
        if (password.length < BUYER_PASSWORD_MIN_LENGTH) {
          setValidation(`Password must be at least ${BUYER_PASSWORD_MIN_LENGTH} characters.`)
          return
        }
        if (password !== confirmPassword) {
          setValidation("Passwords do not match.")
          return
        }
        setValidation(undefined)
        void onSubmit({ email, code: code.trim(), password, rememberMe })
      }}
    >
      {(error || validation) && (
        <ErrorState className="buyer-account-inline-error" title="Registration failed" message={error ?? validation} />
      )}
      <FormField
        label="Email"
        required
        type="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value)
          setCodeSent(false)
          setDevCode(undefined)
        }}
        placeholder="name@gmail.com"
        autoComplete="email"
      />
      <p className="buyer-auth-hint">{buyerAuthEmailHint}</p>
      {codeSent ? (
        <>
          <FormField
            label="Verification code"
            required
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="6-digit code"
            autoComplete="one-time-code"
          />
          <PasswordField
            label="Create a password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </>
      ) : null}
      {devCode ? <p className="buyer-auth-dev-code">Dev code: {devCode}</p> : null}
      <label className="buyer-auth-consent">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>
          I agree to the <a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Policy</a>.
        </span>
      </label>
      <label className="buyer-auth-consent">
        <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
        <span>Keep me signed in on this device</span>
      </label>
      <Button type="submit" loading={loading || sending} fullWidth>
        {loading || sending
          ? codeSent
            ? "Creating account..."
            : "Sending code..."
          : codeSent
            ? "Create account"
            : "Send verification code"}
      </Button>
      {codeSent ? (
        <Button type="button" variant="ghost" fullWidth disabled={sending} onClick={() => void requestCode()}>
          Resend code
        </Button>
      ) : null}
      <DisabledSocialAuth />
      <AuthLegalCopy />
    </form>
  )
}
