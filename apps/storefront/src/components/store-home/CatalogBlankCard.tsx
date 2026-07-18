import type { SupplierCatalogItem } from "../../lib/buyer-api"
import { useBuyerLocale } from "../../lib/locale"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"

type CatalogBlankCardProps = {
  item: SupplierCatalogItem
  opening?: boolean
  onCustomize: (item: SupplierCatalogItem) => void
}

export function CatalogBlankCard({ item, opening = false, onCustomize }: CatalogBlankCardProps) {
  const { t } = useBuyerLocale()
  const categoryLabel = item.categories[0]?.name || item.code

  return (
    <Card as="article" className="buyer-shop-product-card">
      <button
        type="button"
        className="buyer-shop-product-media"
        disabled={opening}
        onClick={() => onCustomize(item)}
        aria-label={`${t("customizeLink")}: ${item.name}`}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <span className="buyer-shop-product-image-placeholder" role="img" aria-label="Blank image unavailable">
            Image unavailable
          </span>
        )}
        <StatusBadge tone="success" className="buyer-shop-product-diy-badge">
          {t("customizeBadge")}
        </StatusBadge>
      </button>
      <div className="buyer-shop-product-body">
        <p>{categoryLabel}</p>
        <h3>
          <button type="button" disabled={opening} onClick={() => onCustomize(item)}>
            {item.name}
          </button>
        </h3>
        <div className="buyer-shop-product-meta">
          <span>{item.code}</span>
        </div>
        <MoneyText
          amount={item.estimatedRetailUsd}
          currencyCode="USD"
          unavailableLabel={t("catalogPricePending")}
        />
        <button
          type="button"
          className="buyer-shop-product-customize"
          disabled={opening}
          onClick={() => onCustomize(item)}
        >
          {opening ? t("catalogOpening") : t("customizeLink")}
        </button>
      </div>
    </Card>
  )
}
