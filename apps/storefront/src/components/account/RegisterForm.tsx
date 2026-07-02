import { useState } from "react"
import { Button } from "../ui/Button"
import { FormField } from "../ui/FormField"
import { ErrorState } from "../ui/States"

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
      {error && <ErrorState className="buyer-account-inline-error" title="Registration failed" message={error} />}
      <div className="buyer-account-two">
        <FormField label="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" autoComplete="given-name" />
        <FormField label="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" autoComplete="family-name" />
      </div>
      <FormField label="Email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" />
      <FormField label="Phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 0100" autoComplete="tel" hint="Optional" />
      <FormField label="Password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" autoComplete="new-password" />
      <Button type="submit" loading={loading}>{loading ? "Creating account..." : "Create account"}</Button>
    </form>
  )
}
