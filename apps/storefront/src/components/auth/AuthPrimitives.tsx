import { useState } from "react"
import { FormField } from "../ui/FormField"

export const BUYER_PASSWORD_MIN_LENGTH = 8

const BUYER_LOGIN_ALLOWED_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "privaterelay.appleid.com",
] as const

const DEFAULT_TEST_EMAILS = ["1355026750@qq.com"]

export const isValidAuthEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export const normalizeAuthEmail = (value: string) => value.trim().toLowerCase()

export const isAllowedBuyerAuthEmail = (value: string) => {
  const email = normalizeAuthEmail(value)
  if (!isValidAuthEmail(email)) return false
  if (DEFAULT_TEST_EMAILS.includes(email)) return true
  const domain = email.slice(email.lastIndexOf("@") + 1)
  return (BUYER_LOGIN_ALLOWED_DOMAINS as readonly string[]).includes(domain)
}

export const buyerAuthEmailHint = "Use a Gmail or Apple account email."

export function PasswordField({
  label = "Password",
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  error?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <FormField
      label={label}
      required
      type={visible ? "text" : "password"}
      value={value}
      minLength={BUYER_PASSWORD_MIN_LENGTH}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      error={error}
      trailingAction={
        <button
          type="button"
          className="buyer-auth-password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
  )
}

export function AuthLegalCopy() {
  return (
    <p className="buyer-auth-legal">
      By continuing, you agree to our <a href="/terms">Terms of Use</a> and acknowledge that you have read our{" "}
      <a href="/privacy">Privacy Policy</a>.
    </p>
  )
}

export function DisabledSocialAuth() {
  return (
    <p className="buyer-auth-social-note">
      Google and Apple one-tap sign-in are coming soon. For now, sign in with an email verification code.
    </p>
  )
}
