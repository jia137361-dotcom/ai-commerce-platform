export type CheckoutAddress = {
  country: string
  state: string
  city: string
  address1: string
  address2: string
  postalCode: string
  label: string
}

type CheckoutAddressPanelProps = {
  value: CheckoutAddress
  onChange: (value: CheckoutAddress) => void
  onSave: () => void
  saving?: boolean
  saved?: boolean
  error?: string
}

const labels = ["Home", "Company", "School", "Parents", "Other"]

export function CheckoutAddressPanel({ value, onChange, onSave, saving = false, saved = false, error }: CheckoutAddressPanelProps) {
  const update = (field: keyof CheckoutAddress, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue })
  }

  const hasAddress = value.address1.trim() || value.city.trim() || value.postalCode.trim()

  return (
    <section className="buyer-checkout-panel buyer-checkout-address">
      <header>
        <span>2</span>
        <div>
          <h2>Delivery address</h2>
          <p>{saved ? "Address saved to checkout cart." : "Save address before selecting shipping."}</p>
        </div>
        <button type="button" onClick={onSave} disabled={saving}>{saving ? "Saving" : "Save"}</button>
      </header>
      {error && <p className="buyer-checkout-inline-error">{error}</p>}

      {!hasAddress && (
        <div className="buyer-checkout-address-empty">
          <span aria-hidden="true">⌖</span>
          <p>No delivery address</p>
        </div>
      )}

      <div className="buyer-checkout-form-grid">
        <label>
          Country / Region
          <input value={value.country} onChange={(event) => update("country", event.target.value)} />
        </label>
        <label>
          State / Province
          <input value={value.state} onChange={(event) => update("state", event.target.value)} placeholder="California" />
        </label>
        <label>
          City
          <input value={value.city} onChange={(event) => update("city", event.target.value)} placeholder="Los Angeles" />
        </label>
        <label>
          ZIP Code
          <input value={value.postalCode} onChange={(event) => update("postalCode", event.target.value)} placeholder="90007" />
        </label>
        <label className="wide">
          Street address
          <input value={value.address1} onChange={(event) => update("address1", event.target.value)} placeholder="Street address or P.O. Box" />
        </label>
        <label className="wide">
          Apt, suite, unit, building, floor
          <input value={value.address2} onChange={(event) => update("address2", event.target.value)} placeholder="Optional" />
        </label>
      </div>

      <div className="buyer-checkout-labels">
        <strong>Address label</strong>
        {labels.map((label) => (
          <button className={value.label === label ? "active" : ""} key={label} type="button" onClick={() => update("label", label)}>
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
