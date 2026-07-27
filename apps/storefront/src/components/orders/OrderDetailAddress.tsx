type OrderAddress = Record<string, unknown> | null | undefined

const read = (address: OrderAddress, key: string) => {
  const value = address?.[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

export function OrderDetailAddress({
  address,
  email,
  trackingHref,
}: {
  address: OrderAddress
  email?: string | null
  trackingHref?: string
}) {
  const receiver = [read(address, "first_name"), read(address, "last_name")].filter(Boolean).join(" ")
  const phone = read(address, "phone")
  const lines = [
    read(address, "address_1"),
    read(address, "address_2"),
    [read(address, "city"), read(address, "province"), read(address, "postal_code")].filter(Boolean).join(", "),
    read(address, "country_code")?.toUpperCase(),
  ].filter(Boolean)

  return (
    <section className="buyer-order-card buyer-order-detail-section">
      <header>
        <h2>Delivery</h2>
      </header>
      <dl className="buyer-order-data-grid buyer-order-data-grid--temu">
        <div>
          <dt>Estimated delivery</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Track number</dt>
          <dd>
            {trackingHref ? (
              <a href={trackingHref}>View logistics</a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Shipping method</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Receiver</dt>
          <dd>{receiver || "—"}</dd>
        </div>
        <div>
          <dt>Phone number</dt>
          <dd>{phone || "—"}</dd>
        </div>
        <div>
          <dt>Delivery address</dt>
          <dd>{lines.length ? lines.join(", ") : "—"}</dd>
        </div>
        {email ? (
          <div>
            <dt>Email</dt>
            <dd>{email}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
