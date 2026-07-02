import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

export function ProductStoreCard({ settings }: { settings: BuyerStoreSettings }) {
  return (
    <Card as="section" className="buyer-product-store-card">
      <div className="buyer-product-store-logo">{settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <span>C</span>}</div>
      <div><p>Sold by</p><h2>{settings.brandName || "Citigoo Official Store"}</h2><span>Store identity from current store context</span></div>
      <Button variant="secondary" href="/store">Visit store</Button>
    </Card>
  )
}
