import { useState } from "react"
import type { BuyerShareInfo } from "../../lib/buyer-api"
import { Modal } from "../ui/Modal"
import { ProductSharePanel } from "./ProductSharePanel"

type ProductDetailPopupsProps = {
  share?: BuyerShareInfo | null
  productTitle: string
  storeHref: string
  onToggleFavorite?: () => void
  isFavorited?: boolean
}

export function ProductDetailPopups({ share, productTitle, storeHref, onToggleFavorite, isFavorited = false }: ProductDetailPopupsProps) {
  const [open, setOpen] = useState<"share" | "shipping" | "country" | "menu" | null>(null)
  const [shipRegion, setShipRegion] = useState("United States")

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      /* ignore */
    }
    setOpen(null)
  }

  return (
    <>
      <div className="buyer-product-toolbar">
        <a href={storeHref} aria-label="Back to store">
          ←
        </a>
        <div className="buyer-product-toolbar-actions">
          {share ? (
            <button type="button" aria-label="Share" onClick={() => setOpen("share")}>
              ↗
            </button>
          ) : null}
          <a href="/cart" aria-label="Cart">
            🛒
          </a>
          <button type="button" aria-label="More" onClick={() => setOpen("menu")}>
            ⋯
          </button>
        </div>
      </div>

      <Modal open={open === "share"} title="Share" onClose={() => setOpen(null)} className="buyer-product-popup">
        {share ? <ProductSharePanel share={share} source="backend" /> : <p>Share link unavailable.</p>}
      </Modal>

      <Modal open={open === "shipping"} title="Shipping policy" onClose={() => setOpen(null)} className="buyer-product-popup">
        <p>Standard production time is 3–4 business days.</p>
        <p>Estimated delivery to the United States is 9–15 business days after production.</p>
        <p>Shipping fees are calculated at checkout based on weight and destination.</p>
      </Modal>

      <Modal open={open === "country"} title="Country & region" onClose={() => setOpen(null)} className="buyer-product-popup">
        <label className="buyer-product-region-field">
          <span>Ship to</span>
          <select value={shipRegion} onChange={(event) => setShipRegion(event.target.value)}>
            <option>United States</option>
            <option>Canada</option>
            <option>United Kingdom</option>
            <option>Australia</option>
          </select>
        </label>
        <p className="buyer-filter-mock-note">Region selection is UI-only in this batch; checkout still uses account preferences.</p>
      </Modal>

      <Modal open={open === "menu"} title="More actions" onClose={() => setOpen(null)} className="buyer-product-popup buyer-product-popup-menu">
        <button type="button" onClick={() => { setOpen("share"); }}>
          Share
        </button>
        {onToggleFavorite ? (
          <button type="button" onClick={() => { onToggleFavorite(); setOpen(null) }}>
            {isFavorited ? "Unsave" : "Save"}
          </button>
        ) : null}
        <button type="button" onClick={copyLink}>
          Copy link
        </button>
        <button type="button" onClick={() => setOpen("shipping")}>
          Shipping policy
        </button>
        <button type="button" onClick={() => setOpen("country")}>
          Country &amp; region
        </button>
        <a href="/account/orders">My orders</a>
        <a href="/cart">Cart</a>
        <a href="/help">Report</a>
      </Modal>
    </>
  )
}
