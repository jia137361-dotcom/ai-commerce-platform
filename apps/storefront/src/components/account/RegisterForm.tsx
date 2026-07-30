import { useState } from "react"
import { AuthLegalCopy, BUYER_PASSWORD_MIN_LENGTH, DisabledSocialAuth, isValidAuthEmail, PasswordField } from "../auth/AuthPrimitives"
import { Button } from "../ui/Button"
import { FormField } from "../ui/FormField"
import { ErrorState } from "../ui/States"

type RegisterFormProps = {
  loading: boolean
  error?: string
  onSubmit: (input: { email: string; password: string }) => Promise<void>
}

export function RegisterForm({ loading, error, onSubmit }: RegisterFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [validation, setValidation] = useState<string>()

  return (
    <form
      className="buyer-account-form buyer-auth-mobile-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!isValidAuthEmail(email)) {
          setValidation("Enter a valid email address.")
          return
        }
        if (password.length < BUYER_PASSWORD_MIN_LENGTH) {
          setValidation("Password must be at least 8 characters.")
          return
        }
        if (!accepted) {
          setValidation("Review and accept the Terms of Use and Privacy Policy.")
          return
        }
        setValidation(undefined)
        void onSubmit({ email, password })
      }}
    >
      {(error || validation) && <ErrorState className="buyer-account-inline-error" title="Registration failed" message={error ?? validation} />}
      <FormField label="Email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" />
      <PasswordField value={password} onChange={setPassword} placeholder="Create a password" autoComplete="new-password" />
      <label className="buyer-auth-consent">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>
          I agree to the <a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Policy</a>.
        </span>
      </label>
      <Button type="submit" loading={loading} fullWidth>{loading ? "Creating account..." : "Create account"}</Button>
      <DisabledSocialAuth />
      <AuthLegalCopy />
    </form>
  )
}
