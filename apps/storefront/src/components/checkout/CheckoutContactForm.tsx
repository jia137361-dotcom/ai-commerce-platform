export type CheckoutContact = {
  email: string
  phone: string
  name: string
}

type CheckoutContactFormProps = {
  value: CheckoutContact
  onChange: (value: CheckoutContact) => void
}

export function CheckoutContactForm({ value, onChange }: CheckoutContactFormProps) {
  const update = (field: keyof CheckoutContact, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <section className="buyer-checkout-panel">
      <header>
        <span>1</span>
        <div>
          <h2>Contact information</h2>
          <p>Used for delivery updates and order lookup.</p>
        </div>
      </header>
      <div className="buyer-checkout-form-grid">
        <label>
          Email
          <input type="email" value={value.email} onChange={(event) => update("email", event.target.value)} placeholder="buyer@example.com" />
        </label>
        <label>
          Phone
          <input type="tel" value={value.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+1 555 0100" />
        </label>
        <label className="wide">
          Full name
          <input value={value.name} onChange={(event) => update("name", event.target.value)} placeholder="Receiver name" />
        </label>
      </div>
    </section>
  )
}
