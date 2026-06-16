import { useEffect, useState } from "react"
import type { BuyerCustomer } from "../../lib/buyer-api"

type AccountProfileFormProps = {
  customer: BuyerCustomer
  loading: boolean
  error?: string
  saved?: boolean
  onSubmit: (input: { firstName?: string; lastName?: string; phone?: string }) => Promise<void>
}

export function AccountProfileForm({ customer, loading, error, saved, onSubmit }: AccountProfileFormProps) {
  const [firstName, setFirstName] = useState(customer.firstName ?? "")
  const [lastName, setLastName] = useState(customer.lastName ?? "")
  const [phone, setPhone] = useState(customer.phone ?? "")

  useEffect(() => {
    setFirstName(customer.firstName ?? "")
    setLastName(customer.lastName ?? "")
    setPhone(customer.phone ?? "")
  }, [customer])

  return (
    <form
      className="buyer-account-card buyer-account-form"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit({ firstName, lastName, phone })
      }}
    >
      <header>
        <p className="buyer-account-kicker">Profile</p>
        <h1>Personal information</h1>
        <p>Email is managed through account security and cannot be edited here.</p>
      </header>
      {error && <p className="buyer-account-error">{error}</p>}
      {saved && <p className="buyer-account-success">Profile saved.</p>}
      <div className="buyer-account-two">
        <label>
          First name
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </label>
      </div>
      <label>
        Phone
        <input value={phone} onChange={(event) => setPhone(event.target.value)} />
      </label>
      <label>
        Email
        <input value={customer.email ?? ""} disabled />
      </label>
      <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save profile"}</button>
    </form>
  )
}
