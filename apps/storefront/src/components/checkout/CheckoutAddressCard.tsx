import type { CheckoutAddress } from "./CheckoutAddressPanel"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { FormField } from "../ui/FormField"
import { StatusBadge } from "../ui/StatusBadge"

type Props = { value: CheckoutAddress; onChange: (value: CheckoutAddress) => void; onSave: () => void; required: boolean; saving: boolean; saved: boolean; error?: string }

export function CheckoutAddressCard({ value, onChange, onSave, required, saving, saved, error }: Props) {
  const update = (field: keyof CheckoutAddress, fieldValue: string) => onChange({ ...value, [field]: fieldValue })
  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-address-card">
      <header><div><p>Step 2</p><h2>Delivery address</h2></div><StatusBadge tone={!required ? "neutral" : saved ? "success" : error ? "danger" : "warning"}>{!required ? "Not required" : saved ? "Saved" : error ? "Error" : "Required"}</StatusBadge></header>
      {!required ? <p className="buyer-checkout-card-copy">Every item in this cart is marked as not requiring shipping.</p> : <>
        {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
        <div className="buyer-checkout-form-grid">
          <FormField label="Country / region" value={value.country} onChange={(event) => update("country", event.target.value)} />
          <FormField label="State / province" value={value.state} onChange={(event) => update("state", event.target.value)} placeholder="Shanghai" />
          <FormField label="City" value={value.city} onChange={(event) => update("city", event.target.value)} />
          <FormField label="Postal code" value={value.postalCode} onChange={(event) => update("postalCode", event.target.value)} />
          <FormField className="wide" label="Street address" value={value.address1} onChange={(event) => update("address1", event.target.value)} />
          <FormField className="wide" label="Apt, suite, unit optional" value={value.address2} onChange={(event) => update("address2", event.target.value)} />
        </div>
        <footer><Button variant="secondary" loading={saving} onClick={onSave}>{saving ? "Saving..." : saved ? "Save changes" : "Save address"}</Button></footer>
      </>}
    </Card>
  )
}
