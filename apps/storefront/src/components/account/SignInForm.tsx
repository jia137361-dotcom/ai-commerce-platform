import { useState } from "react"
import {
  AuthLegalCopy,
  DisabledSocialAuth,
  isAllowedBuyerAuthEmail,
  isValidAuthEmail,
  buyerAuthEmailHint,
  PasswordField,
} from "../auth/AuthPrimitives"
import { Button } from "../ui/Button"
import { FormField } from "../ui/FormField"
import { ErrorState } from "../ui/States"
import { sendBuyerLoginOtp } from "../../lib/buyer-api"

type SignInFormProps = {
  loading: boolean
  error?: string
  onSubmit: (input: { email: string; code?: string; password?: string; rememberMe: boolean }) => Promise<void>
}

export function SignInForm({ loading, error, onSubmit }: SignInFormProps) {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState<string>()
  const [sending, setSending] = useState(false)
  const [usePassword, setUsePassword] = useState(true)
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
    setSending(true)
    setValidation(undefined)
    try {
      const result = await sendBuyerLoginOtp(email)
      setCodeSent(true)
      setDevCode(result.devCode)
      setUsePassword(false)
    } catch (sendError) {
      setValidation(sendError instanceof Error ? sendError.message : "Unable to send sign-in code.")
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
        if (usePassword) {
          if (!password) {
            setValidation("Enter your password.")
            return
          }
          setValidation(undefined)
          void onSubmit({ email, password, rememberMe })
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
        setValidation(undefined)
        void onSubmit({ email, code: code.trim(), rememberMe })
      }}
    >
      {(error || validation) && (
        <ErrorState className="buyer-account-inline-error" title="Sign-in failed" message={error ?? validation} />
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

      {usePassword ? (
        <PasswordField
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
        />
      ) : codeSent ? (
        <FormField
          label="Verification code"
          required
          inputMode="numeric"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="6-digit code"
          autoComplete="one-time-code"
        />
      ) : null}

      {devCode ? <p className="buyer-auth-dev-code">Dev code: {devCode}</p> : null}

      <label className="buyer-auth-consent">
        <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
        <span>Keep me signed in on this device</span>
      </label>

      <div className="buyer-auth-row">
        <button
          type="button"
          className="buyer-auth-linkish"
          onClick={() => {
            setUsePassword((current) => !current)
            setValidation(undefined)
            if (!usePassword) {
              setCodeSent(false)
              setDevCode(undefined)
            }
          }}
        >
          {usePassword ? "Use email code instead" : "Use password instead"}
        </button>
        <a href="/account/forgot-password">Forgot password?</a>
      </div>

      <Button type="submit" loading={loading || sending} fullWidth>
        {loading || sending
          ? usePassword
            ? "Signing in..."
            : codeSent
              ? "Verifying..."
              : "Sending code..."
          : usePassword
            ? "Sign in"
            : codeSent
              ? "Verify and sign in"
              : "Send sign-in code"}
      </Button>
      {codeSent && !usePassword ? (
        <Button type="button" variant="ghost" fullWidth disabled={sending} onClick={() => void requestCode()}>
          Resend code
        </Button>
      ) : null}
      <DisabledSocialAuth />
      <AuthLegalCopy />
    </form>
  )
}
