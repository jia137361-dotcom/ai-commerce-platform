import { useState } from "react"
import { AuthLegalCopy, DisabledSocialAuth, isValidAuthEmail, PasswordField } from "../auth/AuthPrimitives"
import { Button } from "../ui/Button"
import { FormField } from "../ui/FormField"
import { ErrorState } from "../ui/States"

type SignInFormProps = {
  loading: boolean
  error?: string
  onSubmit: (email: string, password: string) => Promise<void>
}

export function SignInForm({ loading, error, onSubmit }: SignInFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
        if (!password) {
          setValidation("Enter your password.")
          return
        }
        setValidation(undefined)
        void onSubmit(email, password)
      }}
    >
      {(error || validation) && <ErrorState className="buyer-account-inline-error" title="Sign-in failed" message={error ?? validation} />}
      <FormField label="Email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" />
      <PasswordField value={password} onChange={setPassword} placeholder="Enter your password" autoComplete="current-password" />
      <div className="buyer-auth-row">
        <span />
        <a href="/account/forgot-password">Forgot password?</a>
      </div>
      <Button type="submit" loading={loading} fullWidth>{loading ? "Signing in..." : "Sign in"}</Button>
      <DisabledSocialAuth />
      <AuthLegalCopy />
    </form>
  )
}
