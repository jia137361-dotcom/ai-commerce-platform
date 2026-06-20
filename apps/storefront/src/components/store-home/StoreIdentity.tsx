import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { Button } from "../ui/Button"

export function StoreIdentity({ settings }: { settings: BuyerStoreSettings }) {
  const name = settings.brandName || "Citigoo Official Store"

  return (
    <section className="buyer-shop-identity" aria-label="Store information">
      <div className="buyer-shop-identity-mark" aria-hidden="true">
        {settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <span>C</span>}
      </div>
      <div className="buyer-shop-identity-copy">
        <h1>{name}</h1>
        <p>Official store · Secure checkout</p>
      </div>
      <div className="buyer-shop-identity-actions">
        <Button variant="secondary" type="button" disabled title="Follow is not available yet">Follow</Button>
        <Button href="/help">Message</Button>
      </div>
    </section>
  )
}
