import type { CartShippingOption } from "../../lib/buyer-api"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"

type Props = { required: boolean; addressSaved: boolean; loading: boolean; error?: string; options: CartShippingOption[]; selectedId: string; methodSaved: boolean; onSelect: (id: string) => void }

export function CheckoutShippingCard({ required, addressSaved, loading, error, options, selectedId, methodSaved, onSelect }: Props) {
  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-shipping-card">
      <header><div><p>Step 3</p><h2>Delivery method</h2></div><StatusBadge tone={!required || methodSaved ? "success" : error ? "danger" : "warning"}>{!required ? "Not required" : methodSaved ? "Selected" : "Pending"}</StatusBadge></header>
      {loading ? <p className="buyer-checkout-card-copy">Loading shipping options...</p> : error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : !required ? <p className="buyer-checkout-card-copy">No shipping method is required for this cart.</p> : !addressSaved ? <p className="buyer-checkout-card-copy">Save a delivery address to load shipping options.</p> : !options.length ? <p className="buyer-checkout-card-copy">No shipping options are available for this address.</p> : <div className="buyer-checkout-shipping-options-new">{options.map((option) => <button className={selectedId === option.id && methodSaved ? "active" : ""} key={option.id} type="button" onClick={() => onSelect(option.id)}><span><strong>{option.name}</strong><small>{selectedId === option.id && methodSaved ? "Selected" : "Select delivery method"}</small></span><MoneyText amount={option.amount} currencyCode={option.currencyCode} /></button>)}</div>}
    </Card>
  )
}
