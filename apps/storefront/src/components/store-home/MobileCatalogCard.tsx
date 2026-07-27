import type { SupplierCatalogItem } from "../../lib/buyer-api"
import { MoneyText } from "../ui/MoneyText"

type MobileCatalogCardProps = {
  item: SupplierCatalogItem
  opening?: boolean
  onViewDetail: (item: SupplierCatalogItem) => void
  onDesignNow: (item: SupplierCatalogItem) => void
}

/** Temu-style card from 页面分析 image85: image / title / price + circle action */
export function MobileCatalogCard({ item, opening = false, onViewDetail, onDesignNow }: MobileCatalogCardProps) {
  const title = item.enName || item.name

  return (
    <article className="buyer-mhome-card">
      <button
        type="button"
        className="buyer-mhome-card-media"
        disabled={opening}
        onClick={() => onViewDetail(item)}
        aria-label={`View ${title}`}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="buyer-mhome-card-placeholder">No image</span>
        )}
      </button>
      <h3>
        <button type="button" disabled={opening} onClick={() => onViewDetail(item)}>
          {title}
        </button>
      </h3>
      <div className="buyer-mhome-card-row">
        <MoneyText amount={item.estimatedRetailUsd} currencyCode="USD" unavailableLabel="—" />
        <button
          type="button"
          className="buyer-mhome-card-action"
          disabled={opening}
          aria-label={`Design now: ${title}`}
          onClick={() => onDesignNow(item)}
        >
          ✎
        </button>
      </div>
    </article>
  )
}
