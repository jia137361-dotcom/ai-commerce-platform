import { useEffect, useState } from "react"
import {
  AuthLegalCopy,
  isAllowedBuyerAuthEmail,
  isValidAuthEmail,
  buyerAuthEmailHint,
  PasswordField,
} from "../auth/AuthPrimitives"
import { Button } from "../ui/Button"
import { FormField } from "../ui/FormField"
import { ErrorState } from "../ui/States"
import { getBuyerGoogleAuthStatus, sendBuyerLoginOtp, startBuyerGoogleAuth } from "../../lib/buyer-api"
import {
  resolveBuyerGoogleCallbackUrl,
  stashBuyerGoogleAuthContext,
  isGoogleAuthUiEnabled,
  withGoogleAccountPickerPrompt,
} from "../../lib/buyer-google-auth"
import { safeReturnTo } from "../../pages/account/account-utils"

type SignInFormProps = {
  loading: boolean
  error?: string
  onSubmit: (input: { email: string; code?: string; password?: string; rememberMe: boolean }) => Promise<void>
}

export function SignInForm({ loading, error, onSubmit }: SignInFormProps) {
  const googleUiFlag = isGoogleAuthUiEnabled()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState<string>()
  const [sending, setSending] = useState(false)
  const [usePassword, setUsePassword] = useState(true)
  const [validation, setValidation] = useState<string>()
  const [googleEnabled, setGoogleEnabled] = useState(googleUiFlag)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string>()
  const [statusChecked, setStatusChecked] = useState(!googleUiFlag)
  const [emailOpen, setEmailOpen] = useState(!googleUiFlag)

  const googleReady = googleUiFlag && googleEnabled

  useEffect(() => {
    if (!googleUiFlag) return
    let active = true
    void getBuyerGoogleAuthStatus().then((status) => {
      if (!active) return
      setGoogleEnabled(status.enabled)
      setStatusChecked(true)
      if (!status.enabled) setEmailOpen(true)
    })
    return () => {
      active = false
    }
  }, [googleUiFlag])

  const startGoogle = async () => {
    setGoogleError(undefined)
    setGoogleLoading(true)
    try {
      stashBuyerGoogleAuthContext({
        returnTo: safeReturnTo(),
        rememberMe,
      })
      const { location } = await startBuyerGoogleAuth({
        callbackUrl: resolveBuyerGoogleCallbackUrl(),
        signOutFirst: true,
      })
      window.location.assign(withGoogleAccountPickerPrompt(location))
    } catch (startError) {
      setGoogleLoading(false)
      setGoogleError(startError instanceof Error ? startError.message : "Unable to start Google sign-in.")
    }
  }

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
      className="buyer-account-form buyer-auth-mobile-form buyer-auth-google-primary"
      onSubmit={(event) => {
        event.preventDefault()
        if (!emailOpen) return
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
      {(error || validation || googleError) && (
        <ErrorState
          className="buyer-account-inline-error"
          title="Sign-in failed"
          message={error ?? validation ?? googleError}
        />
      )}

      <div className="buyer-auth-primary-google">
        {googleReady ? (
          <button
            type="button"
            className="buyer-auth-google-btn buyer-auth-google-btn--primary"
            disabled={googleLoading || loading || (googleUiFlag && !statusChecked)}
            onClick={() => void startGoogle()}
          >
            {googleLoading
              ? "Redirecting to Google…"
              : !statusChecked
                ? "Continue with Google…"
                : "Continue with Google"}
          </button>
        ) : googleUiFlag ? (
          <p className="buyer-auth-social-note">Google sign-in is unavailable in this environment.</p>
        ) : (
          <p className="buyer-auth-social-note">Google one-tap sign-in is coming soon.</p>
        )}
        <p className="buyer-auth-social-note">Apple one-tap sign-in is coming soon.</p>
        <label className="buyer-auth-consent">
          <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
          <span>Keep me signed in on this device</span>
        </label>
      </div>

      <div className="buyer-auth-social buyer-auth-social--secondary">
        <div>
          <span />
          or use email
          <span />
        </div>
      </div>

      {!emailOpen ? (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => {
            setEmailOpen(true)
            setValidation(undefined)
          }}
        >
          Sign in with email
        </Button>
      ) : (
        <div className="buyer-auth-email-secondary">
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

          <Button type="submit" loading={loading || sending || googleLoading} fullWidth>
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
          {googleReady ? (
            <button
              type="button"
              className="buyer-auth-linkish buyer-auth-collapse-email"
              onClick={() => setEmailOpen(false)}
            >
              Hide email sign-in
            </button>
          ) : null}
        </div>
      )}

      <AuthLegalCopy />
    </form>
  )
}
