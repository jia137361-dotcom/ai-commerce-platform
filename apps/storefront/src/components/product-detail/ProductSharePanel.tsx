import type { BuyerShareInfo, DataSource } from "../../lib/buyer-api"
import { Button } from "../ui/Button"

type ProductSharePanelProps = { share: BuyerShareInfo; source: DataSource; error?: string }

export function ProductSharePanel({ share, source, error }: ProductSharePanelProps) {
  const copyLink = share.channels.copy_link?.value ?? share.productUrl
  const copy = async () => { await navigator.clipboard?.writeText(copyLink) }
  return (
    <section className="buyer-product-share" aria-label="Share product">
      <Button variant="secondary" type="button" onClick={() => void copy()}>Share product</Button>
      <span>{source === "backend" ? "Copy a link to this product." : "Fallback product link"}</span>
      {error ? <small>Share service unavailable; the local product link will be copied.</small> : null}
    </section>
  )
}
