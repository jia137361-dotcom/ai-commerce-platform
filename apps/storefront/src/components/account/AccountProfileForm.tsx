import { useEffect, useState } from "react"
import type { BuyerCustomer } from "../../lib/buyer-api"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { FormField } from "../ui/FormField"
import { ErrorState } from "../ui/States"

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
    <Card as="section" className="buyer-account-profile">
      <header className="buyer-account-profile-header">
        <p className="buyer-account-kicker">Profile</p>
        <h1>Personal information</h1>
        <p>Keep the buyer details currently supported by your account API up to date.</p>
      </header>
      <dl className="buyer-account-profile-summary">
        <div><dt>Email</dt><dd>{customer.email || "Not provided"}</dd></div>
        <div><dt>First name</dt><dd>{customer.firstName || "Not provided"}</dd></div>
        <div><dt>Last name</dt><dd>{customer.lastName || "Not provided"}</dd></div>
        <div><dt>Phone</dt><dd>{customer.phone || "Not provided"}</dd></div>
        <div><dt>Address</dt><dd>Not provided</dd></div>
      </dl>
      <p className="buyer-account-readonly-note">Email and address editing are unavailable in the current buyer API.</p>
      <form
        className="buyer-account-form buyer-account-profile-form"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({ firstName, lastName, phone })
        }}
      >
        {error && <ErrorState className="buyer-account-inline-error" title="Profile update failed" message={error} />}
        {saved && <p className="buyer-account-success" role="status">Profile saved.</p>}
        <div className="buyer-account-two">
          <FormField label="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" />
          <FormField label="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" />
        </div>
        <FormField label="Phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" hint="Optional" />
        <FormField label="Email" value={customer.email ?? ""} disabled hint="Managed by account security." />
        <Button type="submit" loading={loading}>{loading ? "Saving..." : "Save profile"}</Button>
      </form>
    </Card>
  )
}
