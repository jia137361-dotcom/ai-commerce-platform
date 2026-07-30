import { useState } from "react"
import { FormField } from "../ui/FormField"

export const BUYER_PASSWORD_MIN_LENGTH = 8

export const isValidAuthEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

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
  const providers = ["G", "f", "Apple", "X"]
  return (
    <div className="buyer-auth-social" aria-label="Social sign-in options are not available yet">
      <div><span /> <p>Or continue with other ways</p><span /></div>
      <div className="buyer-auth-social-buttons">
        {providers.map((provider) => (
          <button key={provider} type="button" disabled aria-disabled="true" title="Social login is not available yet">
            {provider}
          </button>
        ))}
      </div>
    </div>
  )
}
