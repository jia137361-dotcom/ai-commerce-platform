import type { BuyerShareInfo, DataSource } from "../../lib/buyer-api"

type ProductSharePanelProps = {
  share: BuyerShareInfo
  source: DataSource
  error?: string
}

export function ProductSharePanel({ share, source, error }: ProductSharePanelProps) {
  const copyLink = share.channels.copy_link?.value ?? share.productUrl

  const copy = async () => {
    await navigator.clipboard?.writeText(copyLink)
  }

  return (
    <section className="buyer-product-share" aria-label="Share product">
      {error && <p>Share fallback: {error}</p>}
      <button type="button" onClick={() => void copy()}>
        Share
      </button>
      <span>{source === "backend" ? "Share this page with your friends." : "Fallback share link is available."}</span>
    </section>
  )
}
