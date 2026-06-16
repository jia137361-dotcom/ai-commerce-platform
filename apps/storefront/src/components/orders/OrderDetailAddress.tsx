type OrderAddress = Record<string, unknown> | null | undefined

const read = (address: OrderAddress, key: string) => {
  const value = address?.[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

export function OrderDetailAddress({ address, email }: { address: OrderAddress; email?: string | null }) {
  const lines = [
    [read(address, "first_name"), read(address, "last_name")].filter(Boolean).join(" "),
    read(address, "address_1"),
    read(address, "address_2"),
    [read(address, "city"), read(address, "province"), read(address, "postal_code")].filter(Boolean).join(", "),
    read(address, "country_code")?.toUpperCase(),
    read(address, "phone"),
  ].filter(Boolean)

  return (
    <section className="buyer-order-card buyer-order-detail-section">
      <header>
        <p className="buyer-order-kicker">Contact & delivery</p>
        <h2>Delivery information</h2>
      </header>
      <dl className="buyer-order-data-grid">
        <div>
          <dt>Email</dt>
          <dd>{email || "Not provided"}</dd>
        </div>
        <div>
          <dt>Delivery address</dt>
          <dd>{lines.length ? lines.map((line) => <span key={line}>{line}<br /></span>) : "Not provided"}</dd>
        </div>
      </dl>
    </section>
  )
}
