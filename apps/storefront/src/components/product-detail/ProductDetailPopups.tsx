import { useEffect, useState } from "react"
import type { BuyerShareInfo } from "../../lib/buyer-api"
import { Modal } from "../ui/Modal"
import { ProductSharePanel } from "./ProductSharePanel"

type ProductDetailPopupsProps = {
  share?: BuyerShareInfo | null
  productTitle: string
  onToggleFavorite?: () => void
  isFavorited?: boolean
}

export function ProductDetailPopups({ share, productTitle, onToggleFavorite, isFavorited = false }: ProductDetailPopupsProps) {
  const [open, setOpen] = useState<"share" | "shipping" | "country" | "qr" | "menu" | null>(null)
  const [shipRegion, setShipRegion] = useState("United States")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [qrError, setQrError] = useState<string>()

  useEffect(() => {
    if (open !== "qr") return
    let active = true
    setQrError(undefined)
    void import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(window.location.href, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#111827", light: "#ffffff" },
        })
      )
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (active) setQrError("Unable to generate the product QR code.")
      })
    return () => {
      active = false
    }
  }, [open])

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
        <a href="/store" aria-label="Back">
          ←
        </a>
        <div className="buyer-product-toolbar-actions">
          <button type="button" aria-label="Search" onClick={() => window.location.assign("/search")}>
            ⌕
          </button>
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

      <Modal open={open === "qr"} title="Product QR Code" onClose={() => setOpen(null)} className="buyer-product-popup">
        <div className="buyer-product-qr">
          {qrDataUrl ? <img src={qrDataUrl} alt={`QR code for ${productTitle}`} /> : null}
          {!qrDataUrl && !qrError ? <p role="status">Generating QR code…</p> : null}
          {qrError ? <p role="alert">{qrError}</p> : null}
          <strong>{productTitle}</strong>
          <p>Scan to open this product page.</p>
          <button type="button" onClick={copyLink}>
            Copy link
          </button>
        </div>
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
        <button type="button" onClick={() => setOpen("qr")}>
          Product QR Code
        </button>
        <a href="/account/orders">My Order</a>
        <a href="/cart">Cart</a>
        <button type="button" onClick={copyLink}>
          Copy Link
        </button>
        <a href="/help#report">Report</a>
        <button type="button" onClick={() => setOpen("shipping")}>
          Shipping policy
        </button>
        <button type="button" onClick={() => setOpen("country")}>
          Country &amp; region
        </button>
      </Modal>
    </>
  )
}
