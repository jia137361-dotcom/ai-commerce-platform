import { useState } from "react"

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
      {error && <p className="buyer-account-error">{error}</p>}
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" />
      </label>
      <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
    </form>
  )
}
