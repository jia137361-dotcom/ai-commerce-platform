import { useEffect, useState } from "react"
import {
  AuthLegalCopy,
  SocialAuthSection,
  BUYER_PASSWORD_MIN_LENGTH,
  buyerAuthEmailHint,
  isAllowedBuyerAuthEmail,
  isValidAuthEmail,
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

type RegisterFormProps = {
  loading: boolean
  error?: string
  initialReferralCode?: string
  onSubmit: (input: {
    email: string
    code: string
    password: string
    rememberMe: boolean
    referralCode: string
  }) => Promise<void>
}

export function RegisterForm({ loading, error, initialReferralCode = "", onSubmit }: RegisterFormProps) {
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
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string>()
  const [referralCode, setReferralCode] = useState(initialReferralCode)

  useEffect(() => {
    if (!isGoogleAuthUiEnabled()) return
    let active = true
    void getBuyerGoogleAuthStatus().then((status) => {
      if (active) setGoogleEnabled(status.enabled)
    })
    return () => {
      active = false
    }
  }, [])

  const startGoogle = async () => {
    if (!accepted) {
      setValidation("Review and accept the Terms of Use and Privacy Policy.")
      return
    }
    setGoogleError(undefined)
    setGoogleLoading(true)
    try {
      stashBuyerGoogleAuthContext({
        returnTo: safeReturnTo(),
        rememberMe,
        referralCode,
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
        void onSubmit({ email, code: code.trim(), password, rememberMe, referralCode: referralCode.trim() })
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
      <FormField
        label="Referral code (optional)"
        value={referralCode}
        onChange={(event) => setReferralCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        placeholder="Enter a friend's code"
        autoComplete="off"
      />
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
      <Button type="submit" loading={loading || sending || googleLoading} fullWidth>
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
      <SocialAuthSection
        googleEnabled={isGoogleAuthUiEnabled() && googleEnabled}
        googleUnavailableReason={isGoogleAuthUiEnabled() ? "unavailable" : "coming_soon"}
        googleLoading={googleLoading}
        onGoogleClick={() => void startGoogle()}
        error={googleError}
      />
      <AuthLegalCopy />
    </form>
  )
}
