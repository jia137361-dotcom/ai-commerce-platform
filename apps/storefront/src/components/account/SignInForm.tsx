import { useState } from "react"
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

  return (
    <form
      className="buyer-account-form"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(email, password)
      }}
    >
      {error && <ErrorState className="buyer-account-inline-error" title="Sign-in failed" message={error} />}
      <FormField label="Email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" />
      <FormField label="Password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" />
      <Button type="submit" loading={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
    </form>
  )
}
