import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { FormField } from "../ui/FormField"
import { StatusBadge } from "../ui/StatusBadge"

export type CheckoutContact = { email: string; phone: string; name: string }
type Props = { value: CheckoutContact; onChange: (value: CheckoutContact) => void; onSave: () => void; status: "idle" | "saving" | "saved" | "error"; error?: string }

export function CheckoutContactForm({ value, onChange, onSave, status, error }: Props) {
  const update = (field: keyof CheckoutContact, fieldValue: string) => onChange({ ...value, [field]: fieldValue })
  const tone = status === "saved" ? "success" : status === "error" ? "danger" : status === "saving" ? "warning" : "neutral"
  return (
    <Card as="section" className="buyer-checkout-card">
      <header><div><p>Step 1</p><h2>Contact information</h2></div><StatusBadge tone={tone}>{status === "idle" ? "Not saved" : status}</StatusBadge></header>
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
      <div className="buyer-checkout-form-grid">
        <FormField label="Email" type="email" value={value.email} onChange={(event) => update("email", event.target.value)} placeholder="buyer@example.com" />
        <FormField label="Phone" type="tel" value={value.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+86 138 0000 0000" />
        <FormField className="wide" label="Receiver name" value={value.name} onChange={(event) => update("name", event.target.value)} />
      </div>
      <footer><Button variant="secondary" loading={status === "saving"} onClick={onSave}>{status === "saved" ? "Save changes" : "Save contact"}</Button></footer>
    </Card>
  )
}
