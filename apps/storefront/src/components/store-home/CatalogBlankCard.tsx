import type { SupplierCatalogItem } from "../../lib/buyer-api"
import { useBuyerLocale } from "../../lib/locale"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"
import { convertDisplayAmount, useBuyerDisplayPreferences } from "../../lib/buyer-display-preferences"

type CatalogBlankCardProps = {
  item: SupplierCatalogItem
  opening?: boolean
  onViewDetail: (item: SupplierCatalogItem) => void
  onDesignNow: (item: SupplierCatalogItem) => void
}

export function CatalogBlankCard({ item, opening = false, onViewDetail, onDesignNow }: CatalogBlankCardProps) {
  const { t } = useBuyerLocale()
  const { displayCurrencyCode } = useBuyerDisplayPreferences()
  const categoryLabel = item.categories[0]?.enName || item.categories[0]?.name || item.code

  return (
    <Card as="article" className="buyer-shop-product-card">
      <div className="buyer-shop-product-media">
        <button
          type="button"
          className="buyer-shop-product-media-hit"
          disabled={opening}
          onClick={() => onViewDetail(item)}
          aria-label={`View ${item.name}`}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} loading="lazy" />
          ) : (
            <span className="buyer-shop-product-image-placeholder" role="img" aria-label="Blank image unavailable">
              Image unavailable
            </span>
          )}
        </button>
        <StatusBadge tone="success" className="buyer-shop-product-diy-badge">
          {t("customizeBadge")}
        </StatusBadge>
        <button
          type="button"
          className="buyer-shop-product-quick-design"
          disabled={opening}
          aria-label={`Design now: ${item.name}`}
          onClick={() => onDesignNow(item)}
        >
          ✎
        </button>
      </div>
      <div className="buyer-shop-product-body">
        <p>{categoryLabel}</p>
        <h3>
          <button type="button" disabled={opening} onClick={() => onViewDetail(item)}>
            {item.enName || item.name}
          </button>
        </h3>
        <div className="buyer-shop-product-meta">
          <span>{item.code}</span>
        </div>
        <MoneyText
          amount={item.estimatedRetailUsd == null ? null : convertDisplayAmount(item.estimatedRetailUsd, "usd", displayCurrencyCode)}
          currencyCode={displayCurrencyCode}
          unavailableLabel={t("catalogPricePending")}
        />
        <button type="button" className="buyer-shop-product-customize" disabled={opening} onClick={() => onDesignNow(item)}>
          {opening ? t("catalogOpening") : "Design now"}
        </button>
      </div>
    </Card>
  )
}
