export type CheckoutContact = {
  email: string
  phone: string
  name: string
}

type CheckoutContactFormProps = {
  value: CheckoutContact
  onChange: (value: CheckoutContact) => void
  status: "idle" | "saving" | "saved" | "error"
  error?: string
}

export function CheckoutContactForm({ value, onChange, status, error }: CheckoutContactFormProps) {
  const update = (field: keyof CheckoutContact, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <section className="buyer-checkout-panel">
      <header>
        <span>1</span>
        <div>
          <h2>Contact information</h2>
          <p>
            {status === "saving"
              ? "Saving contact to checkout cart..."
              : status === "saved"
                ? "Contact saved to checkout cart."
                : status === "error"
                  ? "Contact could not be saved."
                  : "Used for delivery updates and order lookup."}
          </p>
        </div>
        <strong className={`buyer-checkout-save-status ${status}`}>{status}</strong>
      </header>
      {error && <p className="buyer-checkout-inline-error buyer-checkout-contact-error">{error}</p>}
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
