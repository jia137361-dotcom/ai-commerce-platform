import { useState } from "react"

type RegisterFormProps = {
  loading: boolean
  error?: string
  onSubmit: (input: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => Promise<void>
}

export function RegisterForm({ loading, error, onSubmit }: RegisterFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")

  return (
    <form
      className="buyer-account-form"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit({ email, password, firstName, lastName, phone })
      }}
    >
      {error && <p className="buyer-account-error">{error}</p>}
      <div className="buyer-account-two">
        <label>
          First name
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" autoComplete="given-name" />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" autoComplete="family-name" />
        </label>
      </div>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" />
      </label>
      <label>
        Phone
        <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 0100" autoComplete="tel" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" autoComplete="new-password" />
      </label>
      <button type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
    </form>
  )
}
